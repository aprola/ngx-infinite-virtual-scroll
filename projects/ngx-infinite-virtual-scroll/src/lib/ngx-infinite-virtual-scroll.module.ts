import { NgModule } from '@angular/core';
import { NgxInfiniteVirtualScrollComponent } from './ngx-infinite-virtual-scroll.component';
import {NgxIvItemTemplateDirective, NgxIvLoadingTemplateDirective} from './ng-template.directive';
import {CommonModule} from '@angular/common';
import {ScrollingModule} from '@angular/cdk-experimental/scrolling';

@NgModule({
  imports: [
    CommonModule,
    ScrollingModule
  ],
  declarations: [
    NgxInfiniteVirtualScrollComponent,
    NgxIvItemTemplateDirective,
    NgxIvLoadingTemplateDirective
  ],
  exports: [
    NgxInfiniteVirtualScrollComponent,
    NgxIvItemTemplateDirective,
    NgxIvLoadingTemplateDirective
  ]
})
export class NgxInfiniteVirtualScrollModule { }
