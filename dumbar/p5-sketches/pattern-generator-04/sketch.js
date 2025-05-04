function loadP5Sketch(container) {
    return new p5(function (p) {


        let p1, p2, p3, p4;
        let p2Delta, p3Delta;
        let targetP2, targetP3;

        let foo = 50;
        let step = 30;
        let speed = 0.25;
        let lerpFactor = 0.05;

        let animate = true;
        let debugMode = false;
        let changeSide = true;
        let showBoth = true;

        p.setup = function () {
            const canvas = p.createCanvas(container.clientWidth, container.clientHeight);
            canvas.parent(container.querySelector('.canvas-wrapper'));
            
            p.colorMode(p.HSB, 360, 100, 100);
            p.strokeWeight(15);
            p.stroke(0, 90, 80);
            p.noFill();
            p.frameRate(30);


            p1 = new p.createVector(0, 0);
            p2 = new p.createVector(0, 0);
            p3 = new p.createVector(0, 0);
            p4 = new p.createVector(0, 0);

            p2Delta = new p.createVector(p.random(-foo, foo) * speed,
                p.random(-foo, foo) * speed);
            p3Delta = new p.createVector(p.random(-foo, foo) * speed,
                p.random(-foo, foo) * speed);

            targetP2 = new p.createVector(p.random(p.width), p.random(p.height));
            targetP3 = new p.createVector(p.random(p.width), p.random(p.height));
        }

        p.draw = function () {

            if (!animate) {
                p.background(0);
                p.drawStatic();
                if (showBoth) {
                    changeSide = !changeSide;
                    p.drawStatic();
                }


            } else {
                p.background(0);
                p.drawAnimated();
                if (showBoth) {
                    changeSide = !changeSide;
                    p.drawAnimated();
                }
                p.updateControlPoints();
            }

            if (debugMode) {
                p.pushStyle();
                p.stroke(0, 100, 100);
                p.drawDebug();
                p.popStyle();
            }
        }

        p.drawDebug = function () {
            p.fill(255, 0, 0);
            p.ellipse(p2.x, p2.y, 10, 10);
            p.ellipse(p3.x, p3.y, 10, 10);
        }

        p.drawStatic = function () {
            if (changeSide) {
                for (let i = 0; i <= p.width; i += step) {
                    for (let j = 0; j <= p.height; j += step) {
                        p.bezier(i, p1.y, p2.x, p2.y, p3.x, p3.y, i, p.height);
                    }
                }
            } else {
                for (let i = 0; i <= p.height; i += step) {
                    for (let j = 0; j <= p.width; j += step) {
                        p.bezier(p1.x, i, p2.x, p2.y, p3.x, p3.y, p.width, i);
                    }
                }
            }
        }

        p.drawAnimated = function () {

            let lerpX2 = p.lerp(p2.x, targetP2.x, lerpFactor);
            let lerpY2 = p.lerp(p2.y, targetP2.y, lerpFactor);
            let lerpX3 = p.lerp(p3.x, targetP3.x, lerpFactor);
            let lerpY3 = p.lerp(p3.y, targetP3.y, lerpFactor);

            if (changeSide) {
                for (let i = 0; i <= p.width; i += step) {
                    p.bezier(i, p1.y, lerpX2, lerpY2, lerpX3, lerpY3, i, p.height);
                }
            } else {
                for (let i = 0; i <= p.height; i += step) {
                    p.bezier(p1.x, i, lerpX2, lerpY2, lerpX3, lerpY3, p.width, i);
                }
            }
        }

        p.updateControlPoints = function () {
            let deltaP2 = p5.Vector.sub(targetP2, p2);
            let deltaP3 = p5.Vector.sub(targetP3, p3);

            deltaP2.mult(speed);
            deltaP3.mult(speed);

            p2.add(deltaP2);
            p3.add(deltaP3);

            if (p5.Vector.dist(p2, targetP2) < 1) {
                p2.set(targetP2);
                targetP2.set(p.random(p.width), p.random(p.height));
            }
            if (p5.Vector.dist(p3, targetP3) < 1) {
                p3.set(targetP3);
                targetP3.set(p.random(p.width), p.random(p.height));
            }
        }

        p.keyPressed = function () {

            if (p.key == 'b') {
                showBoth = !showBoth;
            }

            if (p.key == 'r') {
                changeSide = !changeSide;
            }

            if (p.key == 'd') {
                debugMode = !debugMode;
            }
        }

        p.mousePressed = function () {
            if (!animate) {
                p2.set(p.random(p.width), p.random(p.height));
                p3.set(p.random(p.width), p.random(p.height));
                p.background(0);
                p.drawStatic();
            }
        }
    });
}