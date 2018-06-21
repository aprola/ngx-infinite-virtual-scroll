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
import {combineLatest, fromEvent, Subject} from 'rxjs/index';
import {debounceTime, takeWhile} from 'rxjs/operators';
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
  scrollOffset: number;
  listData: any[];
  elemBounds: any;
  offsetTop: any;
  fixedToTop = false;
  progress: number;
  dataLength: number;
  private alive = true;
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
    setTimeout(() => {this.scrollCheck$.next(); }, 500);
  }

  constructor(private _elem: ElementRef, private _zone: NgZone,
              private cdRef: ChangeDetectorRef, private render: Renderer2) {
    // console.log(_elem);
  }

  ngOnInit() {

  }

  ngAfterViewInit() {
    const scrollEnd$ = new Subject<void>();
    scrollEnd$.pipe(
      debounceTime(this.infiniteScrollThrottle),
      takeWhile(() => this.alive)).subscribe(() => {
      this.scrollEnd.emit('');
    });
    if (!this.appendToBody) {
      console.log(this._viewportRef);
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
    this.offsetTop = this._elem.nativeElement.offsetTop;
    this.cdRef.detectChanges();
    this.elemBounds = this._elem.nativeElement.getBoundingClientRect();
    // console.log(this._viewportRef, this.scrollHeight);

    // merge(fromEvent(document, 'resize'), this._viewportRef.

    fromEvent(window, 'resize').pipe(takeWhile(() => this.alive)).subscribe(val => {
      this.elemBounds = this._elem.nativeElement.getBoundingClientRect();
      this.render.setStyle(this._scrollContainerRef.nativeElement, 'left', this.elemBounds.left + 'px');
      this.render.setStyle(this._scrollContainerRef.nativeElement, 'width', this.elemBounds.width + 'px');
    });

    const scroll$ = new Subject<void>();
    this._zone.runOutsideAngular(() => {
      fromEvent(window, 'scroll').pipe(
        debounceTime(this.debounceTime, animationFrame),
        takeWhile(() => this.alive)
      ).subscribe(() => {
        this._zone.run(() => scroll$.next());
      });
    });
    combineLatest(scroll$, this.scrollCheck$).pipe(takeWhile(() => this.alive)).subscribe(val => {
      // const scrollTop = document.documentElement.scrollTop;
      const scrollTop = Math.max(0, document.documentElement.scrollTop - this.offsetTop);

      if (scrollTop && !this.fixedToTop) { this.attachToTop(); }
      if (!scrollTop && this.fixedToTop) { this.detachFromTop(); }
      this.scrollHeight = this._viewportRef._totalContentSize;
      this.containerHeight = this._viewportRef.elementRef.nativeElement.clientHeight;
      if (this.fixedToTop) {
        this.scrollOffset = clamp(0, this.containerHeight, this.containerHeight + scrollTop - this.scrollHeight);
        this.render.setStyle(this._scrollContainerRef.nativeElement, 'transform', 'translateY(-' + this.scrollOffset + 'px)');
      }
      this.scrollTop = scrollTop;
      this.cdRef.detectChanges();
      const stickOffset = this.scrollHeight - this.containerHeight;
      this.progress = clamp(0, 1, (stickOffset - this.scrollTop ) / stickOffset);
      if (this.progress * 10 < this.infiniteScrollDistance) {
        scrollEnd$.next();
      }
      this._viewportRef.setScrollOffset(this.scrollTop || 1);
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
  }

  ngOnDestroy() {
    this.alive = false;
  }
}
