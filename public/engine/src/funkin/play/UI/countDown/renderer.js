// src/funkin/play/UI/countDown/renderer.js

class CountDownRenderer {
  constructor(scene, crochet) {
    this.scene = scene;
    this.crochet = crochet;
    this.steps = ["three", "two", "one", "go"];
  }

  render(stepIndex) {
    if (stepIndex >= this.steps.length) return;

    const stepName = this.steps[stepIndex];
    const skins = this.scene.referee.skins;

    // 1. AUDIO
    let sndPath =
      skins.get(`ui.countdown.${stepName}.audio.path`) ||
      skins.get(`ui.countdown.${stepName}.audio.assetPath`);
    if (sndPath) {
      let sndKey = skins.getKey(`ui.countdown.${stepName}.audio.path`);
      if (!sndKey)
        sndKey = skins.getKey(`ui.countdown.${stepName}.audio.assetPath`);

      if (this.scene.cache.audio.exists(sndKey)) {
        const vol = skins.get(`ui.countdown.${stepName}.audio.volume`, 1.0);
        this.scene.sound.play(sndKey, { volume: vol });
      } else {
        console.warn(`[CountDown] Audio no encontrado: ${sndKey}`);
      }
    }

    // 2. IMAGEN
    let imgPath =
      skins.get(`ui.countdown.${stepName}.image.path`) ||
      skins.get(`ui.countdown.${stepName}.image.assetPath`);
    if (imgPath) {
      let imgKey = skins.getKey(`ui.countdown.${stepName}.image.path`);
      if (!imgKey)
        imgKey = skins.getKey(`ui.countdown.${stepName}.image.assetPath`);

      if (this.scene.textures.exists(imgKey)) {
        const scale = skins.get(`ui.countdown.${stepName}.image.scale`, 1.0);
        const alpha = skins.get(`ui.countdown.${stepName}.image.alpha`, 1.0);

        const x = this.scene.cameras.main.centerX;
        const y = this.scene.cameras.main.centerY;

        const spr = this.scene.add.sprite(x, y, imgKey);
        spr.setScale(scale);
        spr.setAlpha(alpha);

        if (this.scene.referee.cameras) {
          this.scene.referee.cameras.add(spr, "ui");
        }

        this.scene.tweens.add({
          targets: spr,
          alpha: 0,
          duration: this.crochet,
          ease: "Sine.easeInOut",
          onComplete: () => spr.destroy(),
        });
      } else {
        console.warn(`[CountDown] Imagen no encontrada en texturas: ${imgKey}`);
      }
    }
  }
}

window.CountDownRenderer = CountDownRenderer;
