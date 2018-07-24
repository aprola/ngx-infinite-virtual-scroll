import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  TemplateRef,
  ViewChild
} from '@angular/core';
import {CdkVirtualScrollViewport} from '@angular/cdk-experimental';
import {animationFrame} from 'rxjs/internal/scheduler/animationFrame';
import {combineLatest, fromEvent, interval, Subject} from 'rxjs/index';
import {debounceTime, take, takeLast, takeWhile} from 'rxjs/operators';
import {NgxIvItemTemplateDirective, NgxIvLoadingTemplateDirective} from './ng-template.directive';

const clamp = (min: number, max: number, value: number) => Math.min(max, Math.max(min, value));
export interface IvListOptions {width: number; widthInPercentage?: boolean; }

@Component({
  selector: 'ngx-infinite-virtual-scroll',
  templateUrl: './ngx-infinite-virtual-scroll.component.html',
  styleUrls: ['./ngx-infinite-virtual-scroll.component.scss']
})
export class NgxInfiniteVirtualScrollComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() appendToBody: boolean;
  @Input() debounceTime = 0;
  @Input() infiniteScrollThrottle = 500;
  @Input() infiniteScrollDistance = 2;
  scrollHeight = 0;
  containerHeight = 0;
  scrollTop = 0;
  scrollBottomOffset: number;
  listData: any[];
  elemBounds: any;
  offsetTop: any;
  fixedToTop = false;
  progress: number;
  dataLength: number;
  private alive = true;
  @ViewChild('spacer') public _spacerRef: ElementRef;
  @ViewChild('scrollContainer') public _scrollContainerRef: ElementRef;
  @ContentChild(NgxIvItemTemplateDirective) public _templateRef: {template: TemplateRef<any>};
  @ContentChild(NgxIvLoadingTemplateDirective) public _loadingRef: {template: TemplateRef<any>};
  @ViewChild(CdkVirtualScrollViewport) public _viewportRef: CdkVirtualScrollViewport;
  @Output() scrollEnd =  new EventEmitter();
  scrollCheck$ = new Subject<void>();
  _options: IvListOptions;
  @Input()
  set options(val: IvListOptions) {
    this._options = val;
  }
  @Input()
  set ListData(val: any) {
    this.listData = val;
    if (this.listData) {
      this.dataLength = this.listData.length;
    }
    interval(500).pipe(take(4)).subscribe(() => this.scrollCheck$.next());
    this._viewportRef.checkViewportSize();
  }

  constructor(private _elem: ElementRef, private _zone: NgZone,
              private cdRef: ChangeDetectorRef, private render: Renderer2) {}

  ngOnInit() {}

  ngAfterViewInit() {
    const scrollEnd$ = new Subject<void>();
    scrollEnd$.pipe(
      debounceTime(this.infiniteScrollThrottle),
      takeWhile(() => this.alive)).subscribe(() => {
      this.scrollEnd.emit('');
    });
    if (!this.appendToBody) {
      this._viewportRef.renderedRangeStream.pipe(
        takeWhile(() => this.alive)
      ).subscribe((val) => {
        this.progress = (this.dataLength - val.end) / this.dataLength;
        if (this.progress * 10 < this.infiniteScrollDistance) {
          scrollEnd$.next();
        }
      });
      return;
    }
    // this.render.setStyle(this._elem.nativeElement, 'height', 'initial');
    // this.offsetTop = this._elem.nativeElement.offsetTop;
    this.cdRef.detectChanges();
    this.elemBounds = this._elem.nativeElement.getBoundingClientRect();
    this.offsetTop = this.elemBounds.y + window.pageYOffset;

    const scroll$ = new Subject<void>();
    this._zone.runOutsideAngular(() => {
      fromEvent(window, 'scroll').pipe(
        debounceTime(this.debounceTime, animationFrame),
        takeWhile(() => this.alive)
      ).subscribe(() => {
        this._zone.run(() => scroll$.next());
      });
    });


    combineLatest(fromEvent(window, 'resize'), this.scrollCheck$, interval(2000).pipe(take(3))).pipe(
      debounceTime(this.debounceTime, animationFrame),
      takeWhile(() => this.alive)
    ).subscribe(val => {
      this.elemBounds = this._spacerRef.nativeElement.getBoundingClientRect();
      this.render.setStyle(this._scrollContainerRef.nativeElement, 'left', this.elemBounds.left + 'px');
      this.render.setStyle(this._scrollContainerRef.nativeElement, 'width', this.elemBounds.width + 'px');
    });

    combineLatest(scroll$, this.scrollCheck$).pipe(takeWhile(() => this.alive)).subscribe(val => {
      // const scrollTop = document.documentElement.scrollTop;
      const scrollTop = Math.max(0, window.pageYOffset - this.offsetTop);

      if (scrollTop && !this.fixedToTop) { this.attachToTop(); }
      if (!scrollTop && this.fixedToTop) { this.detachFromTop(); }
      const vrange: any = this._viewportRef.getRenderedRange();
      if (vrange.end !== this.dataLength) {
        this.scrollHeight = this._viewportRef._totalContentSize;
      }
      this.containerHeight = this._viewportRef.elementRef.nativeElement.clientHeight;
      if (this.fixedToTop) {
        /*on overflow reached end.*/
        this.scrollBottomOffset = clamp(0, this.containerHeight, this.containerHeight + scrollTop - this.scrollHeight);
        this.render.setStyle(this._scrollContainerRef.nativeElement, 'transform', 'translateY(-' + this.scrollBottomOffset + 'px)');
      }
      this.scrollTop = scrollTop;
      this.cdRef.detectChanges();
      const stickOffset = this.scrollHeight - this.containerHeight;
      this.progress = clamp(0, 1, (stickOffset - scrollTop) / stickOffset);
      if (this.progress * 10 < this.infiniteScrollDistance) {
        scrollEnd$.next();
      }
      if (!this.fixedToTop) {
        this._viewportRef.setScrollOffset(0);
      } else if (this.progress < 1) {
        this._viewportRef.setScrollOffset(this.scrollTop || 1);
      } else {
        this._viewportRef.setScrollOffset(this.scrollHeight);
      }

    });
  }

  attachToTop() {
    this.fixedToTop = true;
    this.render.addClass(this._scrollContainerRef.nativeElement, 'fixed-scroll-container');
    this.render.setStyle(this._scrollContainerRef.nativeElement, 'left', this.elemBounds.left + 'px');
    this.render.setStyle(this._scrollContainerRef.nativeElement, 'width', this.elemBounds.width + 'px');
  }

  detachFromTop() {
    this.fixedToTop = false;
    this.render.removeClass(this._scrollContainerRef.nativeElement, 'fixed-scroll-container');
    this._viewportRef.setScrollOffset(0);
  }

  ngOnDestroy() {
    this.alive = false;
  }
}
