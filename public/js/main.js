document.addEventListener('DOMContentLoaded', () => {

    if (document.body.classList.contains('page-index')) {
        const heroSection = document.querySelector('.hero-section');

        if (heroSection) {
            anime.timeline({
                easing: 'easeOutExpo',
            })
                .add({
                    targets: '.hero-section h1',
                    translateY: [20, 0],
                    opacity: [0, 1],
                    duration: 700,
                })
                .add({
                    targets: '.hero-section p',
                    translateY: [20, 0],
                    opacity: [0, 1],
                    duration: 600,
                }, '-=400')
                .add({
                    targets: '.hero-section .cta-button',
                    translateY: [20, 0],
                    opacity: [0, 1],
                    duration: 500,
                }, '-=400');
        }
    }

});