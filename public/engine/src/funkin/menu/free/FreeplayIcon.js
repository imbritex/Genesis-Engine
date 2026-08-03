// src/funkin/menu/free/FreeplayIcon.js
/**
 * API reutilizable para los iconos de personaje en Freeplay (y potencialmente
 * otros menus). Encapsula el sprite, su spritesheet, su escala base, su pulso
 * al beat y la limpieza de listeners.
 *
 * Uso:
 *   const icon = new FreeplayIcon(scene, "dad", { baseSize: 120, pulseAmount: 0.6 });
 *   icon.bind("freeplay_icon_dad");           // carga textura, crea sprite
 *   icon.isSelected = true;                   // marca/desmarca como seleccionado
 *   // en update(time, delta): icon.update(time, delta)
 *   // al destruir: icon.destroy()
 */
class FreeplayIcon {
  constructor(scene, characterKey, opts = {}) {
    this.scene = scene;
    this.characterKey = characterKey;
    this.baseSize = opts.baseSize ?? 120;
    this.pulseAmount = opts.pulseAmount ?? 0.6;
    this.selectedRotation = opts.selectedRotation ?? 10;
    this.pulseTweenDuration = opts.pulseTweenDuration ?? 120;

    this.sprite = null;
    this.spriteKey = null;
    this.baseScale = 1;
    this.isSelected = false;
    this._pendingKey = null;
    this._pendingBindHandler = null;
    this._onBeat = null;
    this._tween = null;
  }

  bind(spriteKey, fallbackOpp = null) {
    if (!this.scene.textures.exists(spriteKey)) {
      this._pendingKey = spriteKey;
      const key = `freeplay_icon_${fallbackOpp || this.characterKey}`;
      const url = window.Path.icons + spriteKey.replace("freeplay_icon_", "icon-") + ".png";
      this.scene.load.image(spriteKey, url);
      this._pendingBindHandler = () => {
        this._pendingKey = null;
        this._pendingBindHandler = null;
        if (this.scene.textures.exists(spriteKey)) this._attach(spriteKey);
      };
      this.scene.load.once(`filecomplete-image-${spriteKey}`, this._pendingBindHandler);
      if (!this.scene.load.isLoading()) this.scene.load.start();
      return this;
    }
    this._attach(spriteKey);
    return this;
  }

  _attach(spriteKey) {
    this.spriteKey = spriteKey;
    const tex = this.scene.textures.get(spriteKey);
    const src = tex ? tex.getSourceImage() : null;
    const fw = src ? src.width : 150;
    const fh = src ? src.height : 150;
    const fc = fh > 0 ? Math.floor(fw / fh) : 1;
    const frameW = fc > 1 ? Math.round(fw / fc) : fw;
    const finalKey = fc > 1 ? `${spriteKey}_sheet` : spriteKey;
    if (fc > 1 && !this.scene.textures.exists(finalKey)) {
      this.scene.textures.addSpriteSheet(finalKey, src, {
        frameWidth: frameW,
        frameHeight: fh,
      });
    }
    const sprite = this.scene.add.sprite(0, 0, finalKey).setOrigin(0.5, 0.5).setDepth(50);
    if (fc > 1) sprite.setFrame(0);
    const bs = this.baseSize / Math.max(frameW, fh);
    sprite.setScale(bs);
    sprite.setData("baseScale", bs);
    sprite.setVisible(false);
    this.sprite = sprite;
    this.baseScale = bs;
    this._registerBeat();
  }

  _registerBeat() {
    if (!window.Conductor || !window.Conductor.events) return;
    this._onBeat = () => { if (this.isSelected) this.pulse(); };
    window.Conductor.events.on("beatHit", this._onBeat, this);
  }

  pulse() {
    if (!this.sprite) return;
    const peak = this.baseScale * (1 + this.pulseAmount);
    this.sprite.setScale(peak);
    if (this._tween) {
      this._tween.remove();
      this._tween = null;
    }
    this._tween = this.scene.tweens.add({
      targets: this.sprite,
      scaleX: this.baseScale,
      scaleY: this.baseScale,
      duration: this.pulseTweenDuration,
      ease: "Cubic.easeOut",
      onComplete: () => { this._tween = null; },
    });
  }

  update(time, delta) {
    if (!this.sprite) return;
    const bs = this.baseScale;
    if (this.isSelected) {
      this.sprite.setRotation(Phaser.Math.DegToRad(this.selectedRotation));
    } else {
      this.sprite.setRotation(0);
    }
  }

  setVisible(visible) { if (this.sprite) this.sprite.setVisible(visible); }
  setAlpha(a) { if (this.sprite) this.sprite.alpha = a; }
  setPosition(x, y) { if (this.sprite) { this.sprite.x = x; this.sprite.y = y; } }

  destroy() {
    if (this._tween) { this._tween.remove(); this._tween = null; }
    if (this._onBeat && window.Conductor && window.Conductor.events) {
      window.Conductor.events.off("beatHit", this._onBeat, this);
    }
    this._onBeat = null;
    if (this._pendingBindHandler) {
      this.scene.load.off(`filecomplete-image-${this._pendingKey}`, this._pendingBindHandler);
      this._pendingBindHandler = null;
      this._pendingKey = null;
    }
    if (this.sprite) { this.sprite.destroy(); this.sprite = null; }
  }
}

window.FreeplayIcon = FreeplayIcon;