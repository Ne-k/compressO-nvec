// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use lib::fs::{self as file_system};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, Runtime, Url};
use tauri_plugin_fs::FsExt;
use tauri_plugin_log::{Target as LogTarget, TargetKind as LogTargetKind};

use lib::tauri_commands::{
    ffmpeg::{
        __cmd__compress_video, __cmd__compress_videos_batch, __cmd__generate_video_thumbnail,
        __cmd__get_video_info, compress_video, compress_videos_batch, generate_video_thumbnail,
        get_video_info,
    },
    file_manager::{__cmd__show_item_in_file_manager, show_item_in_file_manager},
    fs::{
        __cmd__copy_file_to_clipboard, __cmd__delete_cache, __cmd__delete_file,
        __cmd__get_file_metadata, __cmd__get_image_dimension, __cmd__move_file,
        __cmd__read_files_from_clipboard, copy_file_to_clipboard, delete_cache, delete_file,
        get_file_metadata, get_image_dimension, move_file, read_files_from_clipboard,
    },
};

#[cfg(target_os = "linux")]
use lib::tauri_commands::file_manager::DbusState;
use std::path::PathBuf;
#[cfg(target_os = "linux")]
use std::sync::Mutex;

#[cfg(debug_assertions)]
const LOG_TARGETS: [LogTarget; 1] = [LogTarget::new(LogTargetKind::Stdout)];

#[cfg(not(debug_assertions))]
const LOG_TARGETS: [LogTarget; 0] = [];

struct PendingFiles(Arc<Mutex<Vec<String>>>);

impl PendingFiles {
    fn new() -> Self {
        Self(Arc::new(Mutex::new(Vec::new())))
    }
}

fn handle_open_with_app(app_handle: &tauri::AppHandle, urls: Vec<Url>) {
    let fs_scope = app_handle.fs_scope();
    let asset_scope = app_handle.asset_protocol_scope();

    let new_files: Vec<String> = urls
        .iter()
        .filter_map(|url| url.to_file_path().ok())
        .map(|p| p.to_string_lossy().replace('\\', "\\\\"))
        .collect();

    for url in &urls {
        if let Ok(path) = url.to_file_path() {
            let _ = fs_scope.allow_file(&path);
            let _ = asset_scope.allow_file(&path);
        }
    }

    let pending = app_handle.state::<PendingFiles>();
    let pending_inner = pending.0.clone();

    {
        let mut list = pending_inner.lock().unwrap();
        list.extend(new_files);
    }

    let app_handle_clone = app_handle.clone();
    tokio::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_millis(250)).await;

        let mut list = pending_inner.lock().unwrap();
        if !list.is_empty() {
            let files_to_emit = list.drain(..).collect::<Vec<_>>();
            drop(list);
            let _ = app_handle_clone.emit("open-with-app", files_to_emit);
        }
    });
}

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets(LOG_TARGETS)
                .build(),
        )
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            app.manage(PendingFiles::new());

            #[cfg(target_os = "linux")]
            app.manage(DbusState(Mutex::new(
                dbus::blocking::SyncConnection::new_session().ok(),
            )));

            file_system::setup_app_data_dir(app)?;

            #[cfg(any(windows, target_os = "linux"))]
            {
                let mut files = Vec::new();
                for maybe_file in std::env::args().skip(1) {
                    if maybe_file.starts_with('-') {
                        continue;
                    }
                    if let Ok(url) = url::Url::parse(&maybe_file) {
                        if let Ok(path) = url.to_file_path() {
                            files.push(path);
                        }
                    } else {
                        files.push(PathBuf::from(maybe_file))
                    }
                }
                handle_open_with_app(app.handle().clone(), files);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            compress_video,
            compress_videos_batch,
            generate_video_thumbnail,
            get_video_info,
            get_image_dimension,
            get_file_metadata,
            move_file,
            delete_file,
            delete_cache,
            show_item_in_file_manager,
            copy_file_to_clipboard,
            read_files_from_clipboard
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(
            #[allow(unused_variables)]
            |app_handle, event| {
                #[cfg(any(target_os = "macos"))]
                if let tauri::RunEvent::Opened { urls } = event {
                    handle_open_with_app(app_handle, urls);
                }
            },
        );
}
