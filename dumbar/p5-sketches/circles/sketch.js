// this function is called by the slide-scripts.js when the slide becomes visible
function loadP5Sketch(container) {
    return new p5(function(p) {
        // sketch variables
        let circles = [];
        let isActive = true;
        
        // setup function runs once
        p.setup = function() {
            // create canvas that fills the container
            const canvas = p.createCanvas(container.clientWidth, container.clientHeight);
            canvas.parent(container.querySelector('.canvas-wrapper'));
            
            // setup initial parameters
            p.background(20);
            p.noFill();
            p.strokeWeight(2);
            
            // create initial circles
            for (let i = 0; i < 25; i++) {
                addCircle();
            }
        };
        
        // draw function - runs continuously
        p.draw = function() {
            p.background(20, 15); // semi-transparent background for trails
            
            // update and display circles
            for (let i = circles.length - 1; i >= 0; i--) {
                const circle = circles[i];
                
                // move
                circle.x += circle.vx;
                circle.y += circle.vy;
                
                // bounce off edges
                if (circle.x - circle.size/2 < 0 || circle.x + circle.size/2 > p.width) {
                    circle.vx *= -1;
                }
                if (circle.y - circle.size/2 < 0 || circle.y + circle.size/2 > p.height) {
                    circle.vy *= -1;
                }
                
                // display
                p.stroke(circle.color);
                p.ellipse(circle.x, circle.y, circle.size, circle.size);
                
                // fade and remove if too old
                circle.alpha -= 0.2;
                if (circle.alpha <= 0) {
                    circles.splice(i, 1);
                    addCircle(); // add a new one to replace it
                }
            }
        };
        
        // create a new circle
        function addCircle() {
            const circle = {
                x: p.random(p.width),
                y: p.random(p.height),
                size: p.random(20, 100),
                vx: p.random(-1, 1),
                vy: p.random(-1, 1),
                alpha: 255,
                color: p.color(
                    p.random(100, 255),
                    p.random(100, 255),
                    p.random(100, 255), 
                    255 // alpha
                )
            };
            circles.push(circle);
        }
        
        // handle window resize
        p.windowResized = function() {
            p.resizeCanvas(container.clientWidth, container.clientHeight);
            p.background(20);
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
    });
}