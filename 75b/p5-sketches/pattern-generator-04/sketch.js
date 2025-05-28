// fixed p5js pattern generator with proper instance mode
function loadP5Sketch(container) {
    return new p5(function(p) {
        // set fixed colors
        const bgCol = 'rgb(0, 0, 0)';
        const txtCol = 'rgb(255, 255, 255)';
        const xtrCol = 'rgb(255, 0, 53)';
        
        // ------ [logic] ------
        let drawCount = 0;
        let selectedAction = 0;
        
        // ------ [region shifter] ------
        let region;
        let regionWidth, regionHeight;
        
        let objSize = 28;
        let repeater = 28;
        
        let regions = [];
        
        // ------ [misc] ------
        let foo = 16;
        
        let arr = [foo / 2, foo, foo * 2, foo * 3];
        
        let currentPatternIndex = 0;
        let patterns = ["checkerboard"];
        
        // define region class inside p instance
        class Region {
            constructor(regionX, regionY, regionWidth, regionHeight) {
                this.regionX = regionX;
                this.regionY = regionY;
                this.regionWidth = regionWidth;
                this.regionHeight = regionHeight;
                this.region = p.get(this.regionX, this.regionY, this.regionWidth, this.regionHeight);
                this.selectedAction = p.int(p.random(1, 11)); // use p.int and p.random
                this.drawCount = 0;
                this.animationRunning = true;
                this.foo = foo;
            }
        
            update() {
                if (this.animationRunning) {
                    switch (this.selectedAction) {
                        case 1:
                            p.translate(this.foo, 0);
                            break;
                        case 2:
                            p.translate(0, -this.foo);
                            break;
                        case 4:
                            // simple action instead of text
                            p.translate(this.foo, this.foo);
                            break;
                        case 5:
                            p.translate(this.foo, 0);
                            break;
                        case 6:
                            p.translate(0, this.foo);
                            break;
                        case 7:
                            p.translate(this.foo, 0);
                            break;
                        case 8:
                            p.translate(0, this.foo);
                            break;
                        case 9:
                            p.translate(-this.foo, 0);
                            break;
                        case 10:
                            p.translate(0, -this.foo);
                            break;
                    }
        
                    this.regionX = this.checkBoundary(this.regionX, this.regionWidth, p.width);
                    this.regionY = this.checkBoundary(this.regionY, this.regionHeight, p.height);
        
                    this.region = p.get(this.regionX, this.regionY, this.regionWidth, this.regionHeight);
                    this.drawCount++;
        
                    if (this.drawCount >= repeater) {
                        this.foo = pickMe(arr);
                        this.selectedAction = p.int(p.random(1, 11));
                        this.drawCount = 0;
                    }
                }
            }
        
            display() {
                p.image(this.region, this.regionX, this.regionY);
            }
        
            checkBoundary(position, size, limit) {
                if (position + size > limit) {
                    return 0;
                } else if (position < 0) {
                    return limit - size;
                }
                return position;
            }
        }
        
        // helper functions inside p instance
        function checkerboard() {
            p.push();
            p.noStroke();
            for (let y = 0; y < p.height; y += objSize) {
                for (let x = 0; x < p.width; x += objSize) {
                    let shouldFill = ((x / objSize) + (y / objSize)) % 2 == 0;
                    if (shouldFill) {
                        p.fill(txtCol);
                    } else {
                        p.fill(bgCol);
                    }
                    p.rect(x, y, objSize, objSize);
                }
            }
            p.pop();
        }
        
        function pickMe(inputArray) {
            if (inputArray.length == 0) {
                return 0;
            }
            let randomIndex = p.int(p.random(inputArray.length));
            return inputArray[randomIndex];
        }
        
        p.setup = function() {
            p.pixelDensity(p.displayDensity(2));
            p.frameRate(30);
            const canvas = p.createCanvas(container.clientWidth, container.clientHeight + 200);
            canvas.parent(container.querySelector('.canvas-wrapper'));
            
            // populate screen with fixed regions
            regions.push(new Region(0, 0, p.width / 4, p.height));
            regions.push(new Region(p.width / 4, 0, p.width / 4, p.height));
            regions.push(new Region((2 * p.width) / 4, 0, p.width / 4, p.height));
            regions.push(new Region((3 * p.width) / 4, 0, p.width / 4, p.height));
            regions.push(new Region(0, p.height / 3, p.width, p.height / 4));
            checkerboard();
        };
        
        p.draw = function() {
            for (let region of regions) {
                region.update();
                region.display();
            }
            p.filter(p.THRESHOLD);
        };
        
        p.windowResized = function() {
            p.resizeCanvas(container.clientWidth, container.clientHeight + 200);
        };
    }, container);
}