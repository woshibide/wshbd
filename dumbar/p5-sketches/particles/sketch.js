// this function is called by the slide-scripts.js when the slide becomes visible
function loadP5Sketch(container) {
    return new p5(function(p) {
        // sketch variables
        let particles = [];
        let attractor;
        let isActive = true;
        
        // setup function runs once
        p.setup = function() {
            // create canvas that fills the container
            const canvas = p.createCanvas(container.clientWidth, container.clientHeight);
            canvas.parent(container.querySelector('.canvas-wrapper'));
            
            // setup initial parameters
            p.background(20);
            p.colorMode(p.HSB, 255);
            
            // create attractor
            attractor = {
                x: p.width / 2,
                y: p.height / 2,
                mass: 10
            };
            
            // create initial particles
            for (let i = 0; i < 100; i++) {
                addParticle();
            }
        };
        
        // draw function - runs continuously
        p.draw = function() {
            p.background(20, 10); // semi-transparent for trails
            
            // move attractor with noise
            const t = p.millis() * 0.0005;
            attractor.x = p.map(p.noise(t), 0, 1, 0, p.width);
            attractor.y = p.map(p.noise(t + 10000), 0, 1, 0, p.height);
            
            // update and display particles
            for (let i = particles.length - 1; i >= 0; i--) {
                let particle = particles[i];
                
                // calculate force from attractor
                let dx = attractor.x - particle.x;
                let dy = attractor.y - particle.y;
                let distance = p.sqrt(dx * dx + dy * dy);
                
                // prevent divide by zero
                distance = p.max(distance, 5);
                
                // calculate gravitational force
                let force = attractor.mass * particle.mass / (distance * distance);
                
                // apply force to particle
                let angle = p.atan2(dy, dx);
                particle.vx += force * p.cos(angle);
                particle.vy += force * p.sin(angle);
                
                // apply drag
                particle.vx *= 0.98;
                particle.vy *= 0.98;
                
                // update position
                particle.x += particle.vx;
                particle.y += particle.vy;
                
                // update hue based on speed
                particle.hue = (particle.hue + particle.speed) % 255;
                
                // display particle
                p.noStroke();
                p.fill(particle.hue, 255, 255, particle.alpha);
                p.ellipse(particle.x, particle.y, particle.size, particle.size);
                
                // particle aging
                particle.life -= 1;
                if (particle.life <= 0) {
                    particles.splice(i, 1);
                    addParticle();
                }
            }
        };
        
        // create a new particle
        function addParticle() {
            // random position around the canvas
            let x, y;
            if (p.random() < 0.5) {
                // start from edge
                x = p.random() < 0.5 ? 0 : p.width;
                y = p.random(p.height);
            } else {
                // start from top/bottom
                x = p.random(p.width);
                y = p.random() < 0.5 ? 0 : p.height;
            }
            
            const particle = {
                x: x,
                y: y,
                vx: p.random(-1, 1),
                vy: p.random(-1, 1),
                mass: p.random(0.1, 0.5),
                size: p.random(2, 8),
                hue: p.random(255),
                alpha: p.random(100, 200),
                life: p.random(100, 300),
                speed: p.random(0.5, 2)
            };
            particles.push(particle);
        }
        
        // handle window resize
        p.windowResized = function() {
            p.resizeCanvas(container.clientWidth, container.clientHeight);
            p.background(20);
            
            // update attractor position
            attractor.x = p.width / 2;
            attractor.y = p.height / 2;
        };
        
        // pause animation when not visible
        p.setActive = function(active) {
            isActive = active;
            if (!isActive) {
                p.noLoop();
            } else {
                p.loop();
            }
        };
        
        // handle mouse interaction
        p.mouseMoved = function() {
            if (p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height) {
                attractor.x = p.mouseX;
                attractor.y = p.mouseY;
            }
        };
    });
}