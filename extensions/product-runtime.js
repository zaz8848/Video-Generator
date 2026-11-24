(function () {
    const data = window.PRODUCT;
    if (data.scenario !== 'product' || data.schema !== 'adu-product/1') throw Error('Invalid product contract');
    window.END = data.duration;
    const style = document.createElement('style');
    style.textContent = `html,body,#stage{width:${CONFIG.width}px;height:${CONFIG.height}px}#world{transform-origin:center}`;
    document.head.appendChild(style);
    const overlay = window.OVERLAY;
    if (overlay) window.OVERLAY = time => {
        overlay(time);
        const box = document.querySelector('.native-subtitles');
        if (box.style.opacity === '0') return;
        const available = data.clips[0].bounds.captionBand - 12;
        while (box.getBoundingClientRect().height > available) {
            const children = [...box.children];
            if (children.some(child => parseFloat(getComputedStyle(child).fontSize) <= 10)) throw Error('Caption exceeds reserved band; split the service cue explicitly');
            for (const child of children) child.style.setProperty('font-size', `${parseFloat(getComputedStyle(child).fontSize) - 1}px`, 'important');
        }
        overlay(time);
    };
    for (const clip of data.clips) {
        const scene = new Scene(clip.start, clip.end, CONFIG.background, { cam: 'none' });
        scene.el.dataset.scenario = 'product';
        const viewport = document.createElement('div');
        const bounds = clip.bounds;
        viewport.style.cssText = `position:absolute;overflow:hidden;left:${bounds.x}px;top:${bounds.y}px;width:${bounds.width}px;height:${bounds.height}px`;
        const image = document.createElement('img');
        image.alt = '';
        const scaleX = bounds.width / clip.crop.width, scaleY = bounds.height / clip.crop.height;
        image.style.cssText = `position:absolute;display:block;max-width:none;left:${-clip.crop.x * scaleX}px;top:${-clip.crop.y * scaleY}px;width:${clip.sourceWidth * scaleX}px;height:${clip.sourceHeight * scaleY}px`;
        viewport.appendChild(image);
        scene.el.appendChild(viewport);
        scene.update = time => {
            const index = Math.max(0, Math.min(clip.frames.length - 1, Math.floor((time - clip.start) * CONFIG.fps + 1e-6)));
            const frame = clip.frames[index];
            setFrame(image, frame.file);
            scene.el.dataset.sourceTime = String(frame.sourceTime);
            scene.el.dataset.sourcePts = String(frame.sourcePts);
            scene.el.dataset.sourceSha256 = clip.sha256;
        };
    }
})();