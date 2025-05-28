// this function is called by the slide-scripts.js when the slide becomes visible
function loadP5Sketch(container) {
    return new p5(function(p) {
        // variables
        let balls = [];
        const DRAW_BALLS = true;
        const LERP_AMOUNT = 0.0000001;
        
        let strokeFlag = true;
        let ballsFlag = false;
        let bgFlag = true;
        
        // ball class
        class Ball {
            constructor(x, y) {
                this.pos = p.createVector(x, y);
                this.vel = p5.Vector.random2D();
            }
            
            move() {
                this.pos.add(this.vel);
                if (this.pos.x < 0 || this.pos.x > p.width || this.pos.y < 0 || this.pos.y > p.height) {
                    this.vel.mult(-1);
                }
            }
            
            applyForce(force) {
                this.vel.add(force);
            }
            
            display() {
                if (!ballsFlag) { 
                    p.fill(0, 0, 0, 0); 
                } else {
                    p.fill(255); 
                }
                p.noStroke();
                p.ellipse(this.pos.x, this.pos.y, 10, 10);
            }
        }
        
        p.setup = function() {
            const canvas = p.createCanvas(container.clientWidth, container.clientHeight);
            canvas.parent(container.querySelector('.canvas-wrapper'));
            
            p.ellipseMode(p.CENTER);
            p.colorMode(p.HSB, 360, 100, 100);
            p.noStroke();
            p.background(0);
            
            // create balls
            for (let i = 0; i < 200; i++) {
                balls.push(new Ball(p.random(p.width), p.random(p.height)));
            }
        }
        
        p.draw = function() {
            if (bgFlag) {
                p.background(0);
            }
            
            p.noStroke();
            for (let ball of balls) {
                ball.move();
                if (DRAW_BALLS) {
                    ball.display();
                }
                for (let other of balls) {
                    if (ball !== other) {
                        let d = p.dist(ball.pos.x, ball.pos.y, other.pos.x, other.pos.y);
                        if (d < 100 && strokeFlag) {
                            p.stroke(p.random(0, 30), 80, 94);
                            p.line(ball.pos.x, ball.pos.y, other.pos.x, other.pos.y);
                        }
                        ball.applyForce(p5.Vector.sub(other.pos, ball.pos).mult(LERP_AMOUNT));
                    }
                }
            }
            
            if (!bgFlag) {
                p.fill(0, 10);
                p.rect(0, 0, p.width, p.height);
            }
        }
    });
}