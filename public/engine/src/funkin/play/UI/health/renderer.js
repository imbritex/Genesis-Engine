// src/funkin/play/UI/health/renderer.js

class HealthRenderer {
  constructor(scene, logic) {
    this.scene = scene;
    this.logic = logic;

    this.skins = scene.referee.skins;
    const uniqueSkinId =
      this.scene.playData.uniqueSkinId || this.skins.uniqueId;
    this.textureKey = `health_bar_${uniqueSkinId}`;

    this.posPercent = [50, 89];

    // FORZAR POSICIÓN SUPERIOR (11%) si es downscroll O si las strumlines están en formato móvil
    const isDownscroll = window.Preferences && window.Preferences.downscroll;
    const isMobileStrums = window.isMobile || window.isReactNative;
    const forceTop = isDownscroll || isMobileStrums;

    const currentYPercent = forceTop ? 11 : this.posPercent[1];

    const posX = this.scene.scale.width * (this.posPercent[0] / 100);
    const posY = this.scene.scale.height * (currentYPercent / 100);

    // Iconos de los personajes (comportamiento FNF)
    const charsMeta = this.scene.playData.get("characters") || {};
    const playerId = (charsMeta.players || ["bf"])[0];
    const opponentId = (charsMeta.opponents || ["dad"])[0];
    this._opponentId = opponentId;
    this._iconQueue = [playerId, opponentId];

    this.playerIcon = null;
    this.opponentIcon = null;

    // Bop de los iconos al ritmo (cada beat)
    this._beatListener = () => {
      this._bop(this.playerIcon);
      this._bop(this.opponentIcon);
    };
    if (window.Conductor)
      window.Conductor.events.on("beatHit", this._beatListener, this);

    // 1. Gráficos dinámicos para el relleno de colores
    this.barFillGraphics = this.scene.add.graphics();
    this.barFillGraphics.setScrollFactor(0);
    this.barFillGraphics.setDepth(-19); // Colores encima del marco

    // 2. Imagen del marco de la barra
    this.frameSprite = this.scene.add.sprite(posX, posY, this.textureKey);
    this.frameSprite.setOrigin(0.5, 0.5);
    this.frameSprite.setScrollFactor(0);
    this.frameSprite.setDepth(-20); // Marco por debajo de los colores

    this.barWidth = 601;
    this.barHeight = 19;

    if (this.scene.textures.exists(this.textureKey)) {
      this.barWidth = this.frameSprite.width;
      this.barHeight = this.frameSprite.height;
    } else {
      this.frameSprite.setVisible(false);
    }

    if (
      this.scene.referee.cameras &&
      typeof this.scene.referee.cameras.add === "function"
    ) {
      this.scene.referee.cameras.add(this.barFillGraphics, "ui");
      this.scene.referee.cameras.add(this.frameSprite, "ui");
    }
  }

  update(time, delta) {
    if (
      !this.frameSprite.visible &&
      this.scene.textures.exists(this.textureKey)
    ) {
      this.frameSprite.setTexture(this.textureKey);
      this.frameSprite.setVisible(true);
      this.barWidth = this.frameSprite.width;
      this.barHeight = this.frameSprite.height;
    }

    // AJUSTE DINÁMICO: Recalcular la posición Y por si cambia la preferencia o si entra a modo móvil
    const isDownscroll = window.Preferences && window.Preferences.downscroll;
    const isMobileStrums = window.isMobile || window.isReactNative;
    const forceTop = isDownscroll || isMobileStrums;

    const currentYPercent = forceTop ? 11 : this.posPercent[1];

    const posX = this.scene.scale.width * (this.posPercent[0] / 100);
    const posY = this.scene.scale.height * (currentYPercent / 100);

    this.frameSprite.setPosition(posX, posY);
    this.barFillGraphics.clear();

    const padding = 4;
    const innerWidth = this.barWidth - padding * 2;
    const innerHeight = this.barHeight - padding * 2;

    if (innerWidth <= 0 || innerHeight <= 0) return;

    const innerX = posX - innerWidth / 2;
    const innerY = posY - innerHeight / 2;

    // Seguridad matemática del porcentaje
    let p1Percent = this.logic.healthLerp / 2;
    if (isNaN(p1Percent)) p1Percent = 0.5;
    p1Percent = Phaser.Math.Clamp(p1Percent, 0, 1);

    const charsMeta = this.scene.playData.get("characters") || {};
    const playerId = (charsMeta.players || ["bf"])[0];
    const opponentId = (charsMeta.opponents || ["dad"])[0];
    const playerData = window.dataChars?.[playerId];
    const opponentData = window.dataChars?.[opponentId];
    const toHex = ([r, g, b]) => (r ?? 0x66) << 16 | (g ?? 0xff) << 8 | (b ?? 0x33);
    const userColor = playerData?.health?.color ? toHex(playerData.health.color) : 0x66ff33;
    const opponentColor = opponentData?.health?.color ? toHex(opponentData.health.color) : 0xff0000;

    // 1. Dibujar Barra Enemigo (Fondo Completo)
    this.barFillGraphics.fillStyle(opponentColor, 1);
    this.barFillGraphics.fillRect(innerX, innerY, innerWidth, innerHeight);

    // 2. Dibujar Barra Jugador (Sobre la del enemigo de derecha a izquierda)
    const greenWidth = innerWidth * p1Percent;
    const greenX = innerX + innerWidth - greenWidth;

    if (greenWidth > 0) {
      this.barFillGraphics.fillStyle(userColor, 1);
      this.barFillGraphics.fillRect(greenX, innerY, greenWidth, innerHeight);
    }

    // 3. Verificar si algun icono terminó de cargarse
    if (this._iconQueue.length > 0) {
      this._iconQueue = this._iconQueue.filter(id => {
        const key = `health_icon_${id}`;
        if (!this.scene.textures.exists(key)) return true;
        const isOpponent = id === this._opponentId;
        // Tira horizontal de frames: ancho / alto = nº de frames (redondeado el sobrante)
        const src = this.scene.textures.get(key).getSourceImage();
        const fw = src ? src.width : 150;
        const fh = src ? src.height : 150;
        const fc = fh > 0 ? Math.floor(fw / fh) : 1;
        const frameW = fc > 1 ? Math.round(fw / fc) : fw;
        const frameH = fh;
        // Re-registrar como sprite sheet si tiene más de un frame (ej. 298x101 = 2)
        const spriteKey = fc > 1 ? `health_icon_sheet_${id}` : key;
        if (fc > 1 && !this.scene.textures.exists(spriteKey)) {
          this.scene.textures.addSpriteSheet(spriteKey, src, {
            frameWidth: frameW,
            frameHeight: frameH,
          });
        }
        const icon = this.scene.add.sprite(0, 0, spriteKey);
        icon.setOrigin(0.5, 0.5);
        icon.setScrollFactor(0);
        icon.setDepth(-18);
        // FNF voltea el icono del JUGADOR (bf) para que ambos miren al centro
        icon.setFlipX(!isOpponent);
        const bs = 120 / Math.max(frameW, frameH); // FNF usa 150, aquí algo más compacto
        icon.setScale(bs);
        icon.setData('baseScale', bs);
        icon.setData('frameCount', fc);
        if (fc > 1) icon.setFrame(0);
        if (this.scene.referee.cameras && typeof this.scene.referee.cameras.add === "function")
          this.scene.referee.cameras.add(icon, "ui");
        if (isOpponent) this.opponentIcon = icon;
        else this.playerIcon = icon;
        return false;
      });
    }

    // 4. Posicionar iconos (FNF: el par sigue el borde verde/rojo de la barra)
    // FNF usa origen top-left: bf x = boundary - 26, dad x = boundary - width + 26.
    // Aquí los sprites tienen origen (0.5,0.5), así que ajustamos al centro.
    const pct = 1 - p1Percent;
    const anchorX = innerX + innerWidth * pct;
    if (this.playerIcon) {
      this.playerIcon.x = anchorX - 26 + this.playerIcon.displayWidth / 2;
      this.playerIcon.y = innerY;
      this._updateIconState(this.playerIcon, this.logic.healthLerp);
    }
    if (this.opponentIcon) {
      this.opponentIcon.x = anchorX + 26 - this.opponentIcon.displayWidth / 2;
      this.opponentIcon.y = innerY;
      this._updateIconState(this.opponentIcon, 2 - this.logic.healthLerp);
    }
  }

  _updateIconState(icon, health) {
    const fc = icon.getData('frameCount') || 1;
    if (fc <= 1) return;
    let frame = 0;
    if (health > 1.6) frame = fc >= 3 ? 2 : 0;
    else if (health < 0.4) frame = 1;
    if (icon.frame.index !== frame) icon.setFrame(frame);
  }

  _bop(icon) {
    if (!icon) return;
    const bs = icon.getData('baseScale') || 1;
    this.scene.tweens.killTweensOf(icon);
    icon.setScale(bs * 1.2, bs * 1.2);
    const stepMs = window.Conductor ? window.Conductor.stepLengthMs : 125;
    const dur = Math.min(stepMs * 0.002, 0.175) * 1000;
    this.scene.tweens.add({
      targets: icon,
      scaleX: bs,
      scaleY: bs,
      duration: dur,
      ease: 'Sine.easeOut',
    });
  }

  destroy() {
    if (window.Conductor)
      window.Conductor.events.off("beatHit", this._beatListener, this);
    if (this.barFillGraphics) this.barFillGraphics.destroy();
    if (this.frameSprite) this.frameSprite.destroy();
    if (this.playerIcon) this.playerIcon.destroy();
    if (this.opponentIcon) this.opponentIcon.destroy();
  }
}

window.HealthRenderer = HealthRenderer;
