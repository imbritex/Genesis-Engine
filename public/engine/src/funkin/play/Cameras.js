// src/funkin/play/Cameras.js
class Cameras {
  constructor(scene) {
    this.scene = scene;

    this.game = this.scene.cameras.main;
    this.ui = this.scene.cameras.add(0, 0, this.scene.scale.width, this.scene.scale.height);

    // --- FNF: follow point (cameraFollowPoint) ---
    // La camara sigue un punto invisible con LOCKON + follow rate (0.04 = 4% por frame).
    this.followPoint = { x: 0, y: 0 };
    this.followRate = 0.04; // Constants.DEFAULT_CAMERA_FOLLOW_RATE
    this.following = true; // false mientras un tween de camera controla el scroll
    this.focusPoints = {}; // { players: {x,y}, opponents: {x,y}, spectator: {x,y} }
    this.focusRole = null; // rol al que apunta la camara actualmente
    this.songStarted = false;
    // FNF: quien canta se enfoca en tiempo real. GF (spectator) si nadie canta
    // durante un rato. Si la camara oscila en duetos, limitar el switch con un
    // cooldown aqui (ponytail: 0 = sin cooldown, add >=300 si molesta).
    this.lastHitTime = 0; // tiempo (ms) del ultimo noteHit
    this.gfFocusGap = 2000; // ms sin notas para enfocar GF
    this.focusCooldown = 0; // ms minimos entre cambios de bando

    // --- FNF: zoom / bop ---
    this.baseGameZoom = 1.0; // currentCameraZoom (default, se reemplaza por stage.camZoom)
    this.baseUIZoom = 1.0; // defaultHUDCameraZoom
    this.currentCameraZoom = 1.0;
    this.cameraBopIntensity = 1.015; // Constants.DEFAULT_BOP_INTENSITY
    this.cameraBopMultiplier = 1.0;
    this.hudCameraZoomIntensity = (this.cameraBopIntensity - 1.0) * 2.0;
    this.cameraZoomRate = 4; // Constants.DEFAULT_ZOOM_RATE (beats per bop)
    this.cameraZoomRateOffset = 0; // Constants.DEFAULT_ZOOM_OFFSET

    // --- FREECAM LOGIC ---
    this.freecam = false;
    this.freecamX = this.game.scrollX;
    this.freecamY = this.game.scrollY;
    this.freecamZoom = this.baseGameZoom;
    this.freecamSpeed = 15;

    this.keys = this.scene.input.keyboard.addKeys('W,A,S,D,Q,E');
    this.isDragging = false;

    window.gameCameras = this;

    window.freecam = (enable = true) => {
        if (window.gameCameras) window.gameCameras.enableFreecam(enable);
    };

    // Eventos de Mouse (Drag)
    this.scene.input.on('pointerdown', () => { if (this.freecam) this.isDragging = true; });
    this.scene.input.on('pointerup', () => { this.isDragging = false; });
    this.scene.input.on('pointermove', (pointer) => {
        if (this.freecam && this.isDragging) {
            this.freecamX -= (pointer.position.x - pointer.prevPosition.x) / this.freecamZoom;
            this.freecamY -= (pointer.position.y - pointer.prevPosition.y) / this.freecamZoom;
        }
    });

    // Eventos de Mouse (Wheel para Zoom)
    this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
        if (this.freecam) {
            const zoomSpeed = 0.05;
            if (deltaY > 0) this.freecamZoom = Math.max(0.1, this.freecamZoom - zoomSpeed);
            if (deltaY < 0) this.freecamZoom += zoomSpeed;
        }
    });

    this.stepListener = (curStep) => this.onStepHit(curStep);
    if (window.Conductor) {
      window.Conductor.events.on("stepHit", this.stepListener, this);
    }

    this.onNoteHitListener = this.onNoteHit.bind(this);
    this.scene.events.on("noteHit", this.onNoteHitListener);

    this.scene.events.once("startSong", () => { this.songStarted = true; });

    this.scene.events.once("shutdown", this.shutdown, this);
  }

  // Registra los puntos de enfoque de cada personaje (position + camera_Offset del stage).
  setFocusPoints(points) {
    this.focusPoints = points || {};
    // FNF: la camara arranca enfocando a dad (oponente), con snap inmediato.
    if (this.focusPoints.opponents && this.focusRole !== "players") {
      this.focusRole = "opponents";
      this.followPoint.x = this.focusPoints.opponents.x;
      this.followPoint.y = this.focusPoints.opponents.y;
      const firstSnap = this.focusRole === "opponents";
      this.resetCameraZoom();
      if (firstSnap) {
        this.game.scrollX = this.followPoint.x - this.game.width * 0.5;
        this.game.scrollY = this.followPoint.y - this.game.height * 0.5;
      }
    } else {
      this.resetCameraZoom();
    }
  }

  // FNF: enfocar un personaje (cameraFollowPoint -> su cameraFocusPoint).
  focus(role) {
    const point = this.focusPoints[role];
    if (!point) return;
    this.focusRole = role;
    this.followPoint.x = point.x;
    this.followPoint.y = point.y;
  }

  // FNF: tweenCameraToPosition (sin eventos en los charts, solo API para uso futuro / debug).
  tweenCameraToPosition(x, y, duration = 0, ease = null) {
    this.followPoint.x = x;
    this.followPoint.y = y;
    this.tweenCameraToFollowPoint(duration, ease);
  }

  tweenCameraToFollowPoint(duration = 0, ease = null) {
    this.cancelCameraFollowTween();

    if (duration === 0) {
      this.resetCamera(false, false);
      return;
    }

    // Desactivar follow durante el tween
    this.following = false;
    const targetX = this.followPoint.x - this.game.width * 0.5;
    const targetY = this.followPoint.y - this.game.height * 0.5;

    this.cameraFollowTween = this.scene.tweens.add({
      targets: this.game,
      scrollX: targetX,
      scrollY: targetY,
      duration: duration,
      ease: ease || 'Linear',
      onComplete: () => {
        this.following = true;
      },
    });
  }

  cancelCameraFollowTween() {
    if (this.cameraFollowTween) {
      this.cameraFollowTween.remove();
      this.cameraFollowTween = null;
    }
  }

  // FNF: resetCamera
  resetCamera(resetZoom = true, cancelTweens = true, snap = true) {
    if (cancelTweens) this.cancelCameraFollowTween();
    this.following = true;
    if (resetZoom) this.resetCameraZoom();
    if (snap) {
      this.game.scrollX = this.followPoint.x - this.game.width * 0.5;
      this.game.scrollY = this.followPoint.y - this.game.height * 0.5;
    }
  }

  // FNF: resetCameraZoom -> currentCameraZoom = stage.camZoom (o default 1.0)
  resetCameraZoom() {
    const stageData = this.scene.cache.json.get("stageData_" + this.scene.playData.get("stage", "mainStage"));
    const stageZoom = stageData && stageData.cameraZoom !== undefined ? stageData.cameraZoom : 1.0;
    this.currentCameraZoom = stageZoom;
    this.cameraBopMultiplier = 1.0;
    this.game.zoom = this.currentCameraZoom;
  }

  enableFreecam(enable) {
      this.freecam = enable;
      if (enable) {
          this.freecamX = this.game.scrollX;
          this.freecamY = this.game.scrollY;
          this.freecamZoom = this.baseGameZoom;
          console.log("%c[CAMERAS]%c C mara Libre (Freecam) ACTIVADA", "color: yellow", "color: white");
      } else {
          console.log("%c[CAMERAS]%c C mara Libre (Freecam) DESACTIVADA", "color: yellow", "color: white");
      }
  }

  add(obj, type = "game") {
    if (!obj) return;
    if (type === "ui") {
      this.game.ignore(obj);
    } else {
      this.ui.ignore(obj);
    }
  }

  // FNF: enfoca al personaje que esta cantando en tiempo real.
  onNoteHit(data) {
    this.lastHitTime = window.Conductor ? window.Conductor.songPosition : 0;
    const isOpponent = data && (data.isOpponent === true || (data.note && data.note.noteData && data.note.noteData.p === "op"));
    if (!this.focusPoints.opponents || !this.focusPoints.players) return;
    const side = isOpponent ? "opponents" : "players";
    if (this.focusRole === side) return;
    if (this.focusCooldown > 0) {
      const now = window.Conductor ? window.Conductor.songPosition : 0;
      if (now - this.lastSwitchTime < this.focusCooldown) return;
    }
    this.focus(side);
    this.lastSwitchTime = this.lastHitTime;
  }

  // FNF: se boppa cada cameraZoomRate beats, solo si zoom < 135% del default.
  onStepHit(curStep) {
    if (this.freecam) return;
    if (this.cameraZoomRate <= 0) return;

    const MAX_RELATIVE_CAM_ZOOM = 1.35;
    if (this.ui.zoom < MAX_RELATIVE_CAM_ZOOM * this.baseUIZoom &&
        (curStep + this.cameraZoomRateOffset * 4) % (this.cameraZoomRate * 4) === 0) {
      this.cameraBopMultiplier = this.cameraBopIntensity;
      this.ui.zoom += this.hudCameraZoomIntensity * this.baseUIZoom;
    }
  }

  update(time, delta) {
    const dt = (delta / 1000) * 60; // FNF: dt = elapsed * 60

    if (this.freecam) {
        if (this.keys.W.isDown) this.freecamY -= this.freecamSpeed / this.freecamZoom;
        if (this.keys.S.isDown) this.freecamY += this.freecamSpeed / this.freecamZoom;
        if (this.keys.A.isDown) this.freecamX -= this.freecamSpeed / this.freecamZoom;
        if (this.keys.D.isDown) this.freecamX += this.freecamSpeed / this.freecamZoom;

        const zoomSpeed = 0.02;
        if (this.keys.Q.isDown) this.freecamZoom = Math.max(0.1, this.freecamZoom - zoomSpeed);
        if (this.keys.E.isDown) this.freecamZoom += zoomSpeed;

        this.game.scrollX = Phaser.Math.Linear(this.game.scrollX, this.freecamX, Math.min(1, delta * 0.005));
        this.game.scrollY = Phaser.Math.Linear(this.game.scrollY, this.freecamY, Math.min(1, delta * 0.005));
        this.game.zoom = Phaser.Math.Linear(this.game.zoom, this.freecamZoom, Math.min(1, delta * 0.005));
    } else {
        // Bop decay: cameraBopMultiplier = lerp(1.0, mult, pow(0.95, dt))
        const decayRate = 0.95;
        const ratio = Math.pow(decayRate, dt);
        this.cameraBopMultiplier = Phaser.Math.Linear(1.0, this.cameraBopMultiplier, ratio);
        const zoomPlusBop = this.currentCameraZoom * this.cameraBopMultiplier;
        this.game.zoom = zoomPlusBop;

        // HUD bop decay: lerp(defaultHUDZoom, hudZoom, pow(0.95, dt))
        this.ui.zoom = Phaser.Math.Linear(this.baseUIZoom, this.ui.zoom, ratio);

        // Follow LOCKON: la camara se acerca al followPoint cada frame (4% de distancia).
        if (this.following && this.focusPoints[this.focusRole]) {
          // FNF: si nadie canta desde hace un rato, enfocar a GF (si existe).
          if (this.songStarted && this.focusRole !== "spectator" && this.focusPoints.spectator) {
            const now = window.Conductor ? window.Conductor.songPosition : 0;
            if (now - this.lastHitTime > this.gfFocusGap) this.focus("spectator");
          }
          const targetX = this.followPoint.x - this.game.width * 0.5;
          const targetY = this.followPoint.y - this.game.height * 0.5;
          const lerpFactor = Math.min(1, delta * 0.0024); // 0.04 * 60fps = 2.4/s
          this.game.scrollX = Phaser.Math.Linear(this.game.scrollX, targetX, lerpFactor);
          this.game.scrollY = Phaser.Math.Linear(this.game.scrollY, targetY, lerpFactor);
        }
    }
  }

  shutdown() {
    if (window.Conductor) {
      window.Conductor.events.off("stepHit", this.stepListener, this);
    }
    this.scene.events.off("noteHit", this.onNoteHitListener);
    this.cancelCameraFollowTween();

    window.gameCameras = null;
    window.freecam = null;
  }
}

window.Cameras = Cameras;
