function loadP5Sketch(container) {
    return new p5(function (p) {


        let p1, p2, p3, p4;
        let p2Delta, p3Delta;

        let amplitude = 0.08;
        let foo = 10;
        let step = 10;
        let animate = true;
        let verticalMode = true;


        p.setup = function () {
            const canvas = p.createCanvas(container.clientWidth, container.clientHeight);
            canvas.parent(container.querySelector('.canvas-wrapper'));

            p.strokeWeight(1);
            p.stroke(0);
            p.noFill();
            p.frameRate(5);

            p1 = new p.createVector(0, 0);
            p2 = new p.createVector(0, 0);
            p3 = new p.createVector(0, 0);
            p4 = new p.createVector(0, 0);

            p2Delta = new p.createVector(p.random(-foo, foo) * amplitude, p.random(-foo, foo) * amplitude);
            p3Delta = new p.createVector(p.random(-foo, foo) * amplitude, p.random(-foo, foo) * amplitude);
        }

        p.draw = function () {
            p.background(255);
            if (!animate) {
                p.drawStatic();
            } else {
                p.drawAnimated();
            }
        }

        p.drawStatic = function () {
            if (verticalMode) {
                for (let i = 0; i <= p.height; i += step) {
                    for (let j = 0; j <= p.width; j += step) {
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
            if (verticalMode) {

                for (let i = 0; i <= p.width; i += step) {
                    for (let j = 0; j <= p.height; j += step) {
                        p.updateControlPoints();
                        p.bezier(i, p1.y, p2.x, p2.y, p3.x, p3.y, i, p.height);
                    }
                }
            } else {
                for (let i = 0; i <= p.height; i += step) {
                    for (let j = 0; j <= p.width; j += step) {
                        p.updateControlPoints();
                        p.bezier(p1.x, i, p2.x, p2.y, p3.x, p3.y, p.width, i);
                    }
                }
            }
        }

        p.updateControlPoints = function () {
            p2.add(p2Delta);
            p3.add(p3Delta);

            if (p2.x < 0 || p2.x > p.width) {
                p2Delta.x *= -1;
            }
            if (p2.y < 0 || p2.y > p.height) {
                p2Delta.y *= -1;
            }
            if (p3.x < 0 || p3.x > p.width) {
                p3Delta.x *= -1;
            }
            if (p3.y < 0 || p3.y > p.height) {
                p3Delta.y *= -1;
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