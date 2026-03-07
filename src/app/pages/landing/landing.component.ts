import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './landing.component.html',
    styleUrl: './landing.component.css'
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('cardScene') cardScene!: ElementRef;
    @ViewChild('sceneGlow') sceneGlow!: ElementRef;

    TOTAL = 5;
    cards: HTMLElement[] = [];
    dots: HTMLElement[] = [];
    glowColors = ['#f5a623', '#e94560', '#a855f7', '#22c55e', '#3b82f6'];
    current = 0;
    autoTimer: any;

    // FIX: inject() must be a field initializer, not called inside ngOnInit()
    private authService = inject(AuthService);

    constructor(private router: Router) { }

    ngOnInit(): void {
        // FIX: use the field instead of calling inject() here
        if (this.authService.isAuthenticated) {
            this.router.navigate(['/home']);
        }
    }

    ngAfterViewInit(): void {
        for (let i = 0; i < this.TOTAL; i++) {
            const card = document.getElementById('card' + i);
            if (card) this.cards.push(card);
        }

        const dotsList = document.querySelectorAll('.dot');
        dotsList.forEach(dot => this.dots.push(dot as HTMLElement));

        this.applyCardStates(this.current);
        this.startAutoTimer();
        this.initMouseEvents();
    }

    ngOnDestroy(): void {
        this.stopAutoTimer();
    }

    private startAutoTimer(): void {
        this.autoTimer = setInterval(() => this.nextCard(), 3200);
    }

    private stopAutoTimer(): void {
        if (this.autoTimer) {
            clearInterval(this.autoTimer);
        }
    }

    private resetTimer(): void {
        this.stopAutoTimer();
        this.startAutoTimer();
    }

    nextCard(): void {
        this.current = (this.current + 1) % this.TOTAL;
        this.applyCardStates(this.current);
    }

    goToCard(idx: number): void {
        this.current = idx;
        this.applyCardStates(this.current);
        this.resetTimer();
    }

    private getTransform(offset: number): any {
        const configs = [
            { rotate: 0, tx: 0, ty: -22, scale: 1.04, opacity: 1, z: 10 },
            { rotate: -7, tx: -38, ty: 18, scale: 0.90, opacity: 0.6, z: 4 },
            { rotate: 8, tx: 38, ty: 22, scale: 0.88, opacity: 0.55, z: 3 },
            { rotate: -12, tx: -65, ty: 46, scale: 0.80, opacity: 0.35, z: 2 },
            { rotate: 12, tx: 65, ty: 50, scale: 0.78, opacity: 0.28, z: 1 },
        ];
        return configs[offset] || configs[4];
    }

    private applyCardStates(active: number): void {
        this.cards.forEach((card, i) => {
            card.classList.remove('is-active');
            const offset = (i - active + this.TOTAL) % this.TOTAL;
            const cfg = this.getTransform(offset);
            card.style.zIndex = cfg.z.toString();
            card.style.opacity = cfg.opacity.toString();
            card.style.transform = `rotate(${cfg.rotate}deg) translateX(${cfg.tx}px) translateY(${cfg.ty}px) scale(${cfg.scale})`;
            if (offset === 0) card.classList.add('is-active');
        });

        this.dots.forEach((d, i) => {
            if (i === active) {
                d.classList.add('active');
            } else {
                d.classList.remove('active');
            }
        });

        if (this.sceneGlow) {
            this.sceneGlow.nativeElement.style.background = this.glowColors[active % this.glowColors.length];
        }
    }

    private initMouseEvents(): void {
        if (!this.cardScene) return;

        this.cardScene.nativeElement.addEventListener('mousemove', (e: MouseEvent) => {
            const r = this.cardScene.nativeElement.getBoundingClientRect();
            const mx = e.clientX - r.left - r.width / 2;
            const my = e.clientY - r.top - r.height / 2;
            const rx = -(my / r.height) * 22;
            const ry = (mx / r.width) * 22;
            const cfg = this.getTransform(0);
            this.cards[this.current].style.transform = `rotate(${cfg.rotate}deg) translateX(${cfg.tx}px) translateY(${cfg.ty}px) scale(${cfg.scale}) rotateX(${rx}deg) rotateY(${ry}deg)`;
        });

        this.cardScene.nativeElement.addEventListener('mouseleave', () => {
            const cfg = this.getTransform(0);
            this.cards[this.current].style.transform = `rotate(${cfg.rotate}deg) translateX(${cfg.tx}px) translateY(${cfg.ty}px) scale(${cfg.scale})`;
            this.startAutoTimer();
        });

        this.cardScene.nativeElement.addEventListener('mouseenter', () => this.stopAutoTimer());
    }

    openModal(n: string): void {
        const modal = document.getElementById('modal-' + n);
        if (modal) {
            modal.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(n: string): void {
        const modal = document.getElementById('modal-' + n);
        if (modal) {
            modal.classList.remove('open');
            document.body.style.overflow = '';
        }
    }

    closeOnOverlay(e: MouseEvent, n: string): void {
        const modal = document.getElementById('modal-' + n);
        if (e.target === modal) {
            this.closeModal(n);
        }
    }

    handleCardClick(i: number): void {
        this.goToCard((i + 1) % this.TOTAL);
    }
}
