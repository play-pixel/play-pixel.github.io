// Fireworks Core Engine
// Общая логика для всех версий фейерверков

class FireworksEngine {
    constructor(config = {}) {
        this.canvas = document.getElementById('fireworksCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.uiLayer = document.getElementById('game-ui');

        this.clickCount = 0;
        this.totalClicks = 0;
        this.TARGET_CLICKS = config.targetClicks || 12;
        this.WISHES = config.wishes || [];
        this.GREETING = config.greeting || "С НОВЫМ\nГОДОМ!\n2026";
        this.CREDITS_TEXT = config.creditsText || 'GameDev. Путь Самурая.';
        this.CREDITS_LINK = config.creditsLink || 'https://t.me/gamedev_semenov';

        this.width = 0;
        this.height = 0;
        this.particles = [];
        this.fireworks = [];
        this.animationId = null;
        this.scale = window.devicePixelRatio || 1;

        // Счётчик пожеланий
        this.wishesShown = 0;
        this.wishesCounter = null;

        // Звёзды
        this.stars = [];
        this.starsCanvas = null;
        this.starsCtx = null;

        // Снег
        this.snowflakes = [];

        // Configuration
        this.GRAVITY = 0.05;

        // Audio
        this.fireSound = new Audio('sounds/fire.mp3');
        this.fireSound.volume = 0.5;

        this.fireworksSounds = [
            new Audio('sounds/fireworks1.mp3'),
            new Audio('sounds/fireworks2.mp3'),
            new Audio('sounds/fireworks3.mp3')
        ];
        this.fireworksSounds.forEach(s => s.volume = 0.6);
        this.currentFireworkSound = 0;
        this.bgMusic = new Audio('sounds/ny.mp3');
        this.isFadingOut = false;
        this.musicStarted = false;

        // Shake
        this.shakeIntensity = 0;

        // Bind methods
        this.resize = this.resize.bind(this);
        this.loop = this.loop.bind(this);
        this.handleClick = this.handleClick.bind(this);

        // Initialize
        this.init();
    }

    init() {
        window.addEventListener('resize', this.resize);
        this.resize();
        this.canvas.addEventListener('mousedown', this.handleClick);
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleClick({ clientX: touch.clientX, clientY: touch.clientY });
        });

        // Обработка сворачивания/разворачивания вкладки
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Страница скрыта - останавливаем всё
                this.pause();
            } else {
                // Страница снова видна - продолжаем
                this.resume();
            }
        });

        // Инициализация звёзд
        this.initStars();

        // Инициализация снега
        this.initSnow();

        // Создание счётчика пожеланий
        this.createWishesCounter();

        this.loop();
    }

    pause() {
        // Останавливаем анимацию
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        // Останавливаем музыку
        if (this.bgMusic && !this.bgMusic.paused) {
            this.bgMusic.pause();
        }
        // Останавливаем интервал пожеланий
        if (this.wishesInterval) {
            clearInterval(this.wishesInterval);
            this.wishesInterval = null;
        }
        // Очищаем частицы и фейерверки, чтобы не накапливались
        this.particles = [];
        this.fireworks = [];
    }

    resume() {
        // Возобновляем анимацию, если она была остановлена
        if (!this.animationId) {
            this.loop();
        }
        // Возобновляем музыку, если она была запущена
        if (this.musicStarted && this.bgMusic.paused) {
            this.bgMusic.play().catch(() => { });
        }
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width * this.scale;
        this.canvas.height = this.height * this.scale;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        this.ctx.scale(this.scale, this.scale);

        // Обновляем canvas звёзд
        if (this.starsCanvas) {
            this.starsCanvas.width = this.width;
            this.starsCanvas.height = this.height;
            this.initStars();
        }
    }

    // Звёзды на фоне
    initStars() {
        if (!this.starsCanvas) {
            this.starsCanvas = document.createElement('canvas');
            this.starsCanvas.id = 'stars-canvas';
            this.starsCanvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:0;';
            document.body.insertBefore(this.starsCanvas, this.canvas);
            this.starsCtx = this.starsCanvas.getContext('2d');
        }

        this.starsCanvas.width = this.width;
        this.starsCanvas.height = this.height;

        // Генерируем звёзды
        this.stars = [];
        const starCount = Math.floor((this.width * this.height) / 8000); // ~100 звёзд на экране

        for (let i = 0; i < starCount; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height * 0.7, // Только в верхней части
                size: Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.5 + 0.3,
                twinkleSpeed: Math.random() * 0.02 + 0.005
            });
        }
    }

    drawStars() {
        if (!this.starsCtx) return;

        this.starsCtx.clearRect(0, 0, this.width, this.height);

        this.stars.forEach(star => {
            // Мерцание
            star.alpha += Math.sin(Date.now() * star.twinkleSpeed) * 0.01;
            star.alpha = Math.max(0.1, Math.min(0.8, star.alpha));

            this.starsCtx.beginPath();
            this.starsCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.starsCtx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
            this.starsCtx.fill();
        });
    }

    // Снег
    initSnow() {
        const snowCount = Math.floor(this.width / 15); // Слабый снег

        for (let i = 0; i < snowCount; i++) {
            this.snowflakes.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 2 + 1,
                speedY: Math.random() * 0.5 + 0.2,
                speedX: Math.random() * 0.3 - 0.15,
                alpha: Math.random() * 0.3 + 0.1
            });
        }
    }

    updateSnow() {
        this.snowflakes.forEach(flake => {
            flake.y += flake.speedY;
            flake.x += flake.speedX;

            // Лёгкое покачивание
            flake.x += Math.sin(Date.now() * 0.001 + flake.y * 0.01) * 0.2;

            // Возврат наверх при выходе за экран
            if (flake.y > this.height) {
                flake.y = -5;
                flake.x = Math.random() * this.width;
            }
            if (flake.x > this.width) flake.x = 0;
            if (flake.x < 0) flake.x = this.width;
        });
    }

    drawSnow() {
        this.ctx.save();
        this.snowflakes.forEach(flake => {
            this.ctx.beginPath();
            this.ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${flake.alpha})`;
            this.ctx.fill();
        });
        this.ctx.restore();
    }

    // Счётчик пожеланий
    createWishesCounter() {
        this.wishesCounter = document.createElement('div');
        this.wishesCounter.id = 'wishes-counter';
        this.wishesCounter.textContent = `0 / ${this.WISHES.length}`;
        this.wishesCounter.style.cssText = `
            position: fixed;
            bottom: 60px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 16px;
            color: rgba(255, 215, 0, 0.5);
            font-family: 'Montserrat', sans-serif;
            letter-spacing: 2px;
            z-index: 100;
            opacity: 0;
            transition: opacity 1s ease-in;
        `;
        document.body.appendChild(this.wishesCounter);

        // Счётчик кликов — отдельный элемент, всегда виден
        this.clicksCounter = document.createElement('div');
        this.clicksCounter.id = 'clicks-counter';
        this.clicksCounter.textContent = '0';
        this.clicksCounter.style.cssText = `
            position: fixed;
            bottom: 15px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 24px;
            color: rgba(255, 255, 255, 0.4);
            font-family: 'Montserrat', sans-serif;
            z-index: 100;
            pointer-events: none;
            display: none;
        `;
        document.body.appendChild(this.clicksCounter);
    }

    updateWishesCounter() {
        if (this.wishesCounter) {
            this.wishesCounter.textContent = `${this.wishesShown} / ${this.WISHES.length}`;
            this.wishesCounter.style.opacity = '1';
        }
    }

    random(min, max) {
        return Math.random() * (max - min) + min;
    }

    getDistance(x1, y1, x2, y2) {
        const dx = x1 - x2;
        const dy = y1 - y2;
        return Math.sqrt(dx * dx + dy * dy);
    }

    initAudio() {
        this.fireSound.load();
        this.fireworksSounds.forEach(s => s.load());
        // bgMusic загружается отдельно в playBackgroundMusic()
    }

    playBackgroundMusic() {
        if (this.musicStarted) return;
        this.musicStarted = true;

        console.log("=== Starting background music ===");

        this.bgMusic.volume = 0.25;
        this.bgMusic.currentTime = 0;

        this.bgMusic.play()
            .then(() => {
                console.log("Music is playing!");
            })
            .catch(err => {
                console.error("Failed to play music:", err);
            });

        // Логика плавного затухания в конце и перезапуска
        this.bgMusic.ontimeupdate = () => {
            const timeLeft = this.bgMusic.duration - this.bgMusic.currentTime;
            // За 2 секунды до конца начинаем затухание
            if (this.bgMusic.duration > 0 && timeLeft < 2 && !this.isFadingOut) {
                this.isFadingOut = true;
                let fadeOut = setInterval(() => {
                    if (this.bgMusic.volume > 0.02) {
                        this.bgMusic.volume -= 0.02;
                    } else {
                        clearInterval(fadeOut);
                        this.bgMusic.currentTime = 0;
                        this.isFadingOut = false;
                        this.bgMusic.volume = 0;
                        this.bgMusic.play();
                        // Плавное появление
                        let fadeIn = setInterval(() => {
                            if (this.bgMusic.volume < 0.25) {
                                this.bgMusic.volume += 0.02;
                            } else {
                                this.bgMusic.volume = 0.25;
                                clearInterval(fadeIn);
                            }
                        }, 50);
                    }
                }, 80);
            }
        };
    }

    playFireSound() {
        const sound = this.fireSound.cloneNode();
        sound.volume = 0.5;
        sound.play().catch(() => { });
    }

    playExplosionSound() {
        const originalSound = this.fireworksSounds[this.currentFireworkSound];
        this.currentFireworkSound = (this.currentFireworkSound + 1) % 3;
        const sound = originalSound.cloneNode();
        sound.volume = 0.6;
        sound.play().catch(() => { });
    }

    shakeScreen(intensity = 8) {
        this.shakeIntensity = intensity;
    }

    applyShake() {
        if (this.shakeIntensity > 0) {
            const offsetX = (Math.random() - 0.5) * this.shakeIntensity * 2;
            const offsetY = (Math.random() - 0.5) * this.shakeIntensity * 2;
            this.canvas.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
            this.shakeIntensity *= 0.85;
            if (this.shakeIntensity < 0.5) {
                this.shakeIntensity = 0;
                this.canvas.style.transform = 'translate(0, 0)';
            }
        }
    }

    createParticles(x, y, hue = null, isTextFinale = false, payload = null) {
        if (isTextFinale && payload) {
            for (let i = 0; i < payload.length; i++) {
                const target = payload[i];
                this.particles.push(new TextParticle(x, y, target.x, target.y, hue, this));
            }
            return;
        }

        const particleCount = 115;
        const h = hue || this.random(0, 360);

        for (let i = 0; i < particleCount; i++) {
            this.particles.push(new Particle(x, y, h, this));
        }

        this.playExplosionSound();
        this.shakeScreen(3);
    }

    loop() {
        // Рисуем звёзды
        this.drawStars();

        // Очистка с прозрачностью для trails
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();

        // Обновляем и рисуем снег
        this.updateSnow();
        this.drawSnow();

        for (let i = this.fireworks.length - 1; i >= 0; i--) {
            this.fireworks[i].draw();
            this.fireworks[i].update(i);
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].draw();
            this.particles[i].update(i);
        }

        this.applyShake();
        this.animationId = requestAnimationFrame(this.loop);
    }

    calculateTextCoordinates(text) {
        const offC = document.createElement('canvas');
        const offCtx = offC.getContext('2d');

        offC.width = this.width;
        offC.height = this.height;
        offCtx.clearRect(0, 0, this.width, this.height);

        let lines = text.split('\n');
        let fontSize = this.width / 6;

        offCtx.font = `bold ${fontSize}px "Montserrat", sans-serif`;

        let maxLineWidth = 0;
        lines.forEach(line => {
            const w = offCtx.measureText(line).width;
            if (w > maxLineWidth) maxLineWidth = w;
        });

        const maxWidth = this.width * 0.85;
        if (maxLineWidth > maxWidth) {
            fontSize *= (maxWidth / maxLineWidth);
        }

        const maxHeight = this.height * 0.7;
        const lineHeight = fontSize * 1.2;
        const totalHeight = lineHeight * lines.length;
        if (totalHeight > maxHeight) {
            fontSize *= (maxHeight / totalHeight);
        }

        offCtx.font = `bold ${fontSize}px "Montserrat", sans-serif`;
        offCtx.fillStyle = '#FFFFFF';
        offCtx.textAlign = 'center';
        offCtx.textBaseline = 'middle';

        const finalLineHeight = fontSize * 1.2;
        const totalTextHeight = finalLineHeight * lines.length;
        let startY = Math.max(finalLineHeight, (this.height * 0.4) - (totalTextHeight / 2) + (finalLineHeight / 2));

        lines.forEach((line, i) => {
            offCtx.fillText(line, this.width / 2, startY + (i * finalLineHeight));
        });

        const imgData = offCtx.getImageData(0, 0, this.width, this.height).data;
        const coords = [];
        const step = 3;

        for (let y = 0; y < this.height; y += step) {
            for (let x = 0; x < this.width; x += step) {
                const index = (y * this.width + x) * 4;
                if (imgData[index + 3] > 128) {
                    coords.push({ x, y });
                }
            }
        }
        return coords;
    }

    launchTextFireworks(textStr) {
        const text = textStr || this.GREETING;
        const textCoords = this.calculateTextCoordinates(text);

        const numRockets = 7;
        textCoords.sort((a, b) => a.x - b.x);
        const chunkSize = Math.ceil(textCoords.length / numRockets);

        for (let i = 0; i < numRockets; i++) {
            const chunk = textCoords.slice(i * chunkSize, (i + 1) * chunkSize);
            if (chunk.length === 0) continue;

            const avgX = chunk.reduce((sum, p) => sum + p.x, 0) / chunk.length;
            const avgY = chunk.reduce((sum, p) => sum + p.y, 0) / chunk.length;

            const r = new Firework(this.width / 2 + (i - numRockets / 2) * 100, this.height, avgX, avgY, true, this);
            r.payload = chunk;
            this.fireworks.push(r);
        }
    }

    startWishesSequence() {
        this.playBackgroundMusic();

        // Показываем счётчик кликов
        if (this.clicksCounter) {
            this.clicksCounter.style.display = 'block';
        }

        let index = 0;
        this.wishesInterval = setInterval(() => {
            if (index >= this.WISHES.length) {
                clearInterval(this.wishesInterval);
                this.wishesInterval = null;
                setTimeout(() => this.showCredits(), 3000);
                return;
            }

            this.particles.forEach(p => {
                if (p instanceof TextParticle) {
                    p.decay = 0.01;
                }
            });

            this.launchTextFireworks(this.WISHES[index]);
            this.wishesShown = index + 1;
            this.updateWishesCounter();
            index++;
        }, 5000);
    }

    showCredits() {
        const credits = document.createElement('div');
        credits.innerHTML = `<a href="${this.CREDITS_LINK}" target="_blank" style="color: inherit; text-decoration: none;">${this.CREDITS_TEXT}</a>`;
        credits.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 14px;
            color: rgba(255, 215, 0, 0.5);
            font-family: 'Montserrat', sans-serif;
            letter-spacing: 1px;
            opacity: 0;
            transition: opacity 2s ease-in;
            pointer-events: auto;
            z-index: 1000;
        `;
        document.body.appendChild(credits);
        setTimeout(() => { credits.style.opacity = '1'; }, 100);
    }

    handleClick(e) {
        this.initAudio();
        this.playFireSound();

        // Обновляем счётчик кликов
        this.totalClicks++;
        if (this.clicksCounter) {
            this.clicksCounter.textContent = this.totalClicks;
        }

        // Если мы уже в режиме пожеланий или прошли порог кликов, пробуем запустить музыку при клике
        // Это помогает обойти блокировку аудио браузером
        if (this.clickCount >= this.TARGET_CLICKS) {
            this.playBackgroundMusic();
        }

        // Скрываем подсказку при любом клике, если она видна
        if (this.uiLayer && this.clickCount >= this.TARGET_CLICKS) {
            this.uiLayer.style.display = 'none';
        }

        if (this.clickCount >= this.TARGET_CLICKS) {
            const startX = this.width / 2 + this.random(-200, 200);
            this.fireworks.push(new Firework(startX, this.height, e.clientX, e.clientY, false, this));
            return;
        }

        this.clickCount++;

        const startX = this.width / 2 + this.random(-200, 200);
        const targetY = (e.clientY - this.height * 0.15) + this.random(-this.height * 0.05, this.height * 0.05);
        this.fireworks.push(new Firework(startX, this.height, e.clientX, targetY, false, this));

        if (this.clickCount === this.TARGET_CLICKS) {
            setTimeout(() => {
                this.launchTextFireworks(this.GREETING);
                if (this.uiLayer) this.uiLayer.style.display = 'none';

                // Через 1 секунду снова показываем подсказку, но с новым текстом
                setTimeout(() => {
                    if (this.uiLayer) {
                        const titleDiv = this.uiLayer.querySelector('div');
                        if (titleDiv) titleDiv.textContent = 'ПРОДОЛЖАЙ НАЖИМАТЬ';
                        this.uiLayer.style.display = 'block';
                        this.uiLayer.style.opacity = '1';
                    }
                }, 1000);

                setTimeout(() => {
                    if (this.uiLayer) this.uiLayer.style.display = 'none';
                    this.startWishesSequence();
                }, 4000);
            }, 1000);
        }
    }
}

// Класс фейерверка
class Firework {
    constructor(startX, startY, targetX, targetY, isFinale = false, engine) {
        this.engine = engine;
        this.x = startX;
        this.y = startY;
        this.startX = startX;
        this.startY = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.isFinale = isFinale;
        this.payload = null;

        this.distanceToTarget = engine.getDistance(startX, startY, targetX, targetY);

        const angle = Math.atan2(targetY - startY, targetX - startX);
        const speed = 18;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        this.coordinates = [];
        let count = 3;
        while (count--) {
            this.coordinates.push([this.x, this.y]);
        }

        this.hue = isFinale ? 45 : engine.random(0, 360);
        this.brightness = engine.random(50, 70);
    }

    update(index) {
        this.coordinates.pop();
        this.coordinates.unshift([this.x, this.y]);

        this.vx *= 0.99;
        this.vy *= 0.99;
        this.vy += 0.02;

        this.x += this.vx;
        this.y += this.vy;

        const distanceTraveled = this.engine.getDistance(this.startX, this.startY, this.x, this.y);
        const reachedTarget = distanceTraveled >= this.distanceToTarget;
        const stalled = this.vy >= 3;

        if (reachedTarget || stalled) {
            this.engine.createParticles(this.x, this.y, this.hue, this.isFinale, this.payload);
            this.engine.fireworks.splice(index, 1);
        }
    }

    draw() {
        const ctx = this.engine.ctx;
        ctx.beginPath();
        ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
        ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = `hsl(${this.hue}, 100%, ${this.brightness}%)`;
        ctx.lineWidth = this.isFinale ? 3 : 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${this.hue}, 100%, 80%)`;
        ctx.fill();
    }
}

// Класс частицы
class Particle {
    constructor(x, y, hue, engine) {
        this.engine = engine;
        this.x = x;
        this.y = y;
        this.hue = hue;
        this.coordinates = [];
        let count = 5;
        while (count--) {
            this.coordinates.push([this.x, this.y]);
        }

        const angle = engine.random(0, Math.PI * 2);
        const speed = engine.random(1, 17);

        this.vx = Math.cos(angle) * speed * engine.random(0.5, 1);
        this.vy = Math.sin(angle) * speed * engine.random(0.5, 1);

        this.friction = 0.95;
        this.alpha = 1;
        this.decay = engine.random(0.008, 0.02);
        this.brightness = engine.random(50, 80);
    }

    update(index) {
        this.coordinates.pop();
        this.coordinates.unshift([this.x, this.y]);

        this.vx *= this.friction;
        this.vy *= this.friction;
        this.vy += this.engine.GRAVITY;

        this.x += this.vx;
        this.y += this.vy;

        this.alpha -= this.decay;

        if (this.alpha <= this.decay) {
            this.engine.particles.splice(index, 1);
        }
    }

    draw() {
        const ctx = this.engine.ctx;
        ctx.beginPath();
        ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
        ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = `hsla(${this.hue}, 100%, ${this.brightness}%, ${this.alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
}

// Класс текстовой частицы
class TextParticle {
    constructor(x, y, targetX, targetY, hue, engine) {
        this.engine = engine;
        this.x = x;
        this.y = y;
        this.targetX = targetX;
        this.targetY = targetY;

        const angle = engine.random(0, Math.PI * 2);
        const speed = engine.random(5, 15);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        this.hue = hue;
        this.alpha = 1;
        this.decay = 0;
        this.size = engine.random(1.2, 3.5);
    }

    update(index) {
        this.vx *= 0.92;
        this.vy *= 0.92;

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;

        this.vx += dx * 0.05;
        this.vy += dy * 0.05;

        this.x += this.vx;
        this.y += this.vy;

        this.alpha -= this.decay;

        if (this.alpha <= 0) {
            this.engine.particles.splice(index, 1);
        }
    }

    draw() {
        const ctx = this.engine.ctx;
        ctx.fillStyle = `hsla(${this.hue}, 100%, 70%, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        if (Math.random() > 0.95) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
