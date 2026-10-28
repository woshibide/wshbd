// Glitching checkerboard behind the error code: vertical and horizontal strips of the canvas
// keep copying themselves in random directions until everything smears into noise.
// p5 instance mode; `p` is the sketch.

const OBJ_SIZE = 28;
const REPEATER = 28;
const STEP = 16;
const STEPS = [STEP / 2, STEP, STEP * 2, STEP * 3];

export function errorSketch(code, colors) {
    return p => {
        const regions = [];

        const pick = values => values[Math.floor(p.random(values.length))];

        function drawText() {
            p.stroke(colors.text);
            p.strokeWeight(2);
            p.fill(colors.background);
            p.text(String(code), p.width / 2, p.height / 2 + 50);
        }

        function checkerboard() {
            p.push();
            p.noStroke();
            for (let y = 0; y < p.height; y += OBJ_SIZE) {
                for (let x = 0; x < p.width; x += OBJ_SIZE) {
                    p.fill(((x / OBJ_SIZE) + (y / OBJ_SIZE)) % 2 === 0 ? colors.text : colors.background);
                    p.rect(x, y, OBJ_SIZE, OBJ_SIZE);
                }
            }
            p.pop();
        }

        class Region {
            constructor(x, y, width, height) {
                this.x = x;
                this.y = y;
                this.width = width;
                this.height = height;
                this.image = p.get(x, y, width, height);
                this.action = p.int(p.random(1, 30));
                this.drawCount = 0;
                this.step = STEP;
            }

            update() {
                // translate() accumulates within a frame, so each region shifts the ones drawn after it
                switch (this.action) {
                    case 1: case 5: case 7: p.translate(this.step, 0); break;
                    case 2: case 10: p.translate(0, -this.step); break;
                    case 3: drawText(); break;
                    case 6: case 8: p.translate(0, this.step); break;
                    case 9: p.translate(-this.step, 0); break;
                    default: break;
                }
                this.x = this.wrap(this.x, this.width, p.width);
                this.y = this.wrap(this.y, this.height, p.height);
                this.image = p.get(this.x, this.y, this.width, this.height);
                this.drawCount += 1;
                if (this.drawCount >= REPEATER) {
                    this.step = pick(STEPS);
                    this.action = p.int(p.random(1, 11));
                    this.drawCount = 0;
                }
            }

            display() {
                p.image(this.image, this.x, this.y);
            }

            wrap(position, size, limit) {
                if (position + size > limit) return 0;
                if (position < 0) return limit - size;
                return position;
            }
        }

        p.setup = () => {
            p.pixelDensity(p.displayDensity(2));
            p.frameRate(30);
            p.createCanvas(p.windowWidth, p.windowHeight + 200);
            p.textAlign(p.CENTER);
            p.textFont('Helvetica', p.windowWidth * 0.3);
            const { width, height } = p;
            regions.push(new Region(0, 0, width / 4, height));
            regions.push(new Region(width / 4, 0, width / 4, height));
            regions.push(new Region((2 * width) / 4, 0, width / 4, height));
            regions.push(new Region((3 * width) / 4, 0, width / 4, height));
            regions.push(new Region(0, height / 3, width, height / 4));
            checkerboard();
            drawText();
        };

        p.draw = () => {
            for (const region of regions) {
                region.update();
                region.display();
            }
            p.filter(p.THRESHOLD);
        };
    };
}
