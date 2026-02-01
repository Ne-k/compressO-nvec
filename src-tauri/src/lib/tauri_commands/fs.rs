use clipboard_rs::{Clipboard, ClipboardContext};
use tauri::Manager;

use crate::{domain::FileMetadata, ffmpeg, fs};

#[tauri::command]
pub async fn get_file_metadata(file_path: &str) -> Result<FileMetadata, String> {
    fs::get_file_metadata(file_path)
}

#[tauri::command]
pub async fn get_image_dimension(image_path: &str) -> Result<(u32, u32), String> {
    fs::get_image_dimension(image_path)
}

#[tauri::command]
pub async fn move_file(from: &str, to: &str) -> Result<(), String> {
    if let Err(err) = fs::copy_file(from, to).await {
        return Err(err.to_string());
    }

    if let Err(err) = fs::delete_file(from).await {
        return Err(err.to_string());
    }

    Ok(())
}

#[tauri::command]
pub async fn delete_file(path: &str) -> Result<(), String> {
    if let Err(err) = fs::delete_file(path).await {
        return Err(err.to_string());
    }
    Ok(())
}

#[tauri::command]
pub async fn delete_cache(app: tauri::AppHandle) -> Result<(), String> {
    let ffmpeg = ffmpeg::FFMPEG::new(&app)?;
    if let Err(err) = fs::delete_stale_files(&ffmpeg.get_asset_dir(), 0).await {
        return Err(err.to_string());
    }
    Ok(())
}

#[tauri::command]
pub async fn copy_file_to_clipboard(app: tauri::AppHandle, file_path: &str) -> Result<(), String> {
    let ctx = ClipboardContext::new().map_err(|err| err.to_string())?;
    ctx.set_files(vec![file_path.to_owned()])
        .map_err(|err| err.to_string())?;
    Ok(())
}
