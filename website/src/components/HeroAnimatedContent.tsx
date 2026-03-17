import { TextFade } from './effects/TextFade'
import { ZoomInBounce } from './effects/ZoomInBounce'
import compressoLogo from "../assets/compresso.png";
import { TextBlurIn } from './effects/TextBlurIn';

function HeroAnimatedContent() {
    return <>
        <ZoomInBounce>
            <img
                src={compressoLogo.src}
                alt="Compresso Logo"
                className="w-25 h-auto block  mx-auto!"
            />
        </ZoomInBounce>
        <TextBlurIn className="badge">
            ✨ 100% Free & Open Source
        </TextBlurIn>
        <TextFade direction="down">
            <h1>
                Compress any video.<br />
            </h1>
            <p className="gradient-text title mb-5!">Completely private.</p>
        </TextFade>
    </>
}

export default HeroAnimatedContent;