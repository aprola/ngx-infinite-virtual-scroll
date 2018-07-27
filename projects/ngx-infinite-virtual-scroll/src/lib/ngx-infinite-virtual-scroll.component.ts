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
import {combineLatest, fromEvent, Subject} from 'rxjs';
import {debounceTime, takeWhile} from 'rxjs/internal/operators';
import {NgxIvItemTemplateDirective, NgxIvLoadingTemplateDirective} from './ng-template.directive';
import {CdkVirtualScrollViewport} from '@angular/cdk-experimental/scrolling';
import {animationFrame} from 'rxjs/internal/scheduler/animationFrame';

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
  scrollOffset: number;
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
  @Input() scrollCheck$ = new Subject<void>();
  _options: IvListOptions;
  private fixedToBottom: boolean;
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
    setTimeout(() => {this.scrollCheck$.next(); }, 1000);
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


    combineLatest(fromEvent(window, 'resize'), this.scrollCheck$, scroll$.pipe(debounceTime(2000))).pipe(
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
      this.scrollHeight = this._viewportRef._totalContentSize;
      this.containerHeight = this._viewportRef.elementRef.nativeElement.clientHeight;
      // if (this.fixedToTop) {
      //   /*on overflow reached end.*/
      //   this.scrollOffset = clamp(0, this.scrollHeight - this.containerHeight, scrollTop);
      //   this.render.setStyle(this._scrollContainerRef.nativeElement, 'transform', 'translateY(-' + this.scrollOffset + 'px)');
      // }
      this.scrollTop = scrollTop;
      this.cdRef.detectChanges();
      const stickOffset = this.scrollHeight - this.containerHeight;
      this.progress = clamp(0, 1, (stickOffset - scrollTop) / stickOffset);
      if (this.progress * 10 < this.infiniteScrollDistance) {
        scrollEnd$.next();
      }
      let setScrollTo = 0;
      if (!this.fixedToTop) {
        setScrollTo = 0;
      } else if (this.progress > 0) {
        setScrollTo = this.scrollTop;
        if (this.fixedToBottom) { this.detachFromBottom(); }
      } else {
        setScrollTo = this.scrollHeight;
        if (!this.fixedToBottom) { this.attachToBottom(); }
      }
      this._viewportRef.setScrollOffset(clamp(0, this.scrollHeight - this.containerHeight, setScrollTo));
    });
  }
  attachToBottom() {
    this.fixedToBottom = true;
    this.render.removeClass(this._scrollContainerRef.nativeElement, 'fixed-scroll-container');
    this.render.setStyle(this._scrollContainerRef.nativeElement
      , 'transform', 'translateY(' + (this.scrollHeight - this.containerHeight) + 'px)');
  }
  detachFromBottom() {
    this.fixedToBottom = false;
    this.render.addClass(this._scrollContainerRef.nativeElement, 'fixed-scroll-container');
    this.render.setStyle(this._scrollContainerRef.nativeElement, 'transform', 'translateY(0)');
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

  resize() {
    this.scrollCheck$.next();
  }
  ngOnDestroy() {
    this.alive = false;
  }
}
