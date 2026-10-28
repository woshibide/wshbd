document.getElementById('mode-toggle').addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
});

// open me on a random chapter
window.onload = function() {
    var anchors = document.querySelectorAll('.section-nav a');
    var randomIndex = Math.floor(Math.random() * anchors.length);
    var randomAnchor = anchors[randomIndex];
    // Smoothly scroll to the randomly chosen section
    var targetId = randomAnchor.getAttribute('href').substring(1);
    var targetElement = document.getElementById(targetId);
    if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
    }
};

// Smooth scroll for anchor links
var anchorLinks = document.querySelectorAll('.section-nav a');
anchorLinks.forEach(link => {
    link.addEventListener('click', function(event) {
        event.preventDefault();
        var targetId = this.getAttribute('href').substring(1);
        var targetElement = document.getElementById(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth' });
        }
    });
});
