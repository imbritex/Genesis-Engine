/**
 * Función principal encargada de ejecutar las animaciones y la carga en tiempo real del tema clásico.
 *
 * @param {Phaser.Scene} scene - La escena actual desde donde se solicitan los recursos.
 * @param {Function} onComplete - Función callback que avanza a la siguiente escena al terminar.
 */
export default function playCustomLoading(scene, onComplete) {
  scene.load.audio('ggiigle', `public/images/ui/loading/${scene.loadingTheme}/ggiigle.ogg`);
  scene.load.image('fnf_logo', `public/images/ui/loading/${scene.loadingTheme}/FNF_logo.webp`);

  scene.load.once('complete', () => {
    const width = scene.cameras.main.width; // Ancho máximo de la vista del juego
    const height = scene.cameras.main.height; // Alto máximo de la vista del juego

    const ggiigleSound = scene.sound.add('ggiigle'); // Objeto de audio para el efecto de sonido

    ggiigleSound.play();

    let logo; // Variable que almacenará la instancia de la imagen del logotipo

    scene.time.delayedCall(900, () => {
      logo = scene.add
        .image(width / 2, height / 2, 'fnf_logo')
        .setOrigin(0.5)
        .setScale(0.25)
        .setAlpha(1);

      scene.tweens.add({
        targets: logo,
        scale: 0.2,
        ease: 'Back.easeOut',
        duration: 250,
      });
    });

    ggiigleSound.once('complete', () => {
      if (logo) logo.destroy();
      onComplete();
    });
  });

  scene.load.start();
}