class SoundTrayRenderer {
  static init() {
    if (
      !window.HUD ||
      typeof SoundTray === "undefined" ||
      typeof Controls === "undefined"
    ) {
      requestAnimationFrame(() => SoundTrayRenderer.init());
      return;
    }

    this.scene = window.HUD;
    this.lastVol = SoundTray.vol;
    this.isMuted = this.scene.sound.mute;

    this.scene.load.image("volumebox", Path.UI + "soundtray/volumebox.png");
    for (let i = 1; i <= 10; i++) {
      this.scene.load.image(`bars_${i}`, Path.UI + `soundtray/bars_${i}.png`);
    }

    this.scene.load.once("complete", () => this.build());
    this.scene.load.start();
  }

  static build() {
    const scale = 0.8;
    const offsetY = -17;

    // max bars bg
    this.bg = this.scene.add.image(0, offsetY, "bars_10");
    this.bg.setAlpha(0.3);
    this.bg.setScale(scale);

    // volume box
    this.box = this.scene.add.image(0, 0, "volumebox");
    this.box.setScale(scale);

    // active bars
    this.bar = this.scene.add.image(0, offsetY, "bars_1");
    this.bar.setScale(scale);

    this.hiddenY = -100;
    this.visibleY = 60;
    this.isVisible = false;

    this.container = this.scene.add.container(
      this.scene.scale.width / 2,
      this.hiddenY,
      [this.bg, this.box, this.bar],
    );
    this.container.setDepth(100);

    this.scene.events.on("update", () => this.update());

    // input listeners
    window.addEventListener("keydown", (e) => this.handleInput(e));
    window.addEventListener("mousedown", () => this.handleInput());
    window.addEventListener("touchstart", () => this.handleInput());
  }

  static handleInput(e) {
    if (
      e &&
      (Controls.VOL_UP(e) || Controls.VOL_DOWN(e) || Controls.VOL_MUTE(e))
    )
      return;

    if (this.isVisible && this.lastVol > 0 && !this.isMuted) {
      this.startHideTimer(500);
    }
  }

  static update() {
    const currentMute = this.scene.sound.mute;
    if (this.lastVol !== SoundTray.vol || this.isMuted !== currentMute) {
      this.lastVol = SoundTray.vol;
      this.isMuted = currentMute;
      this.renderVol();
    }
  }

  static renderVol() {
    let lvl = Math.min(10, Math.max(0, Math.round(this.lastVol * 10)));

    if (lvl === 0 || this.isMuted) {
      this.bar.setVisible(false);
    } else {
      this.bar.setVisible(true);
      this.bar.setTexture(`bars_${lvl}`);
    }

    this.show();
  }

  static show() {
    if (this.hideTween) this.hideTween.stop();

    if (!this.isVisible) {
      this.isVisible = true;
      this.scene.tweens.add({
        targets: this.container,
        y: this.visibleY,
        duration: 300,
        ease: "Back.inOut",
      });
    }

    if (this.lastVol > 0 && !this.isMuted) {
      this.startHideTimer(1500);
    } else {
      if (this.hideTimer) this.hideTimer.remove();
    }
  }

  static startHideTimer(delay) {
    if (this.hideTimer) this.hideTimer.remove();

    this.hideTimer = this.scene.time.delayedCall(delay, () => {
      if (this.lastVol > 0 && !this.isMuted) this.hide();
    });
  }

  static hide() {
    this.isVisible = false;
    this.hideTween = this.scene.tweens.add({
      targets: this.container,
      y: this.hiddenY,
      duration: 300,
      ease: "Back.in",
    });
  }
}

SoundTrayRenderer.init();
