/**
 * Función principal encargada de ejecutar las animaciones y la interactividad en la versión web.
 *
 * @param {Phaser.Scene} scene - La escena actual desde donde se solicitan los recursos.
 * @param {Function} onComplete - Función callback que avanza a la siguiente escena al terminar.
 */
export default function playWebLoading(scene, onComplete) {
  scene.load.image('touchToPlay', `./public/images/ui/loading/${scene.loadingTheme}/touchHereToPlay.webp`);

  scene.load.once('complete', () => {
    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;

    const touchImage = scene.add
      .image(width / 2, height / 2, 'touchToPlay')
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.5);

    scene.tweens.add({
      targets: touchImage,
      alpha: 1,
      duration: 400,
    });

    touchImage.setInteractive({ pixelPerfect: true });

    touchImage.on('pointerover', () => {
      scene.tweens.killTweensOf(touchImage);
      scene.tweens.add({
        targets: touchImage,
        scale: 0.5,
        duration: 200,
        ease: 'Sine.easeOut',
      });
    });

    touchImage.on('pointerout', () => {
      scene.tweens.killTweensOf(touchImage);
      scene.tweens.add({
        targets: touchImage,
        scale: 0.4,
        duration: 200,
        ease: 'Sine.easeIn',
      });
    });

    touchImage.on('pointerdown', () => {
      touchImage.disableInteractive();

      scene.tweens.add({
        targets: touchImage,
        scale: 0.5,
        alpha: 0,
        duration: 250,
        ease: 'Back.easeIn',
        onComplete: () => {
          touchImage.destroy();
          onComplete();
        },
      });
    });
  });

  scene.load.start();
}