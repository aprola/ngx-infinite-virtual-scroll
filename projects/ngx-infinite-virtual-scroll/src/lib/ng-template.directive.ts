import {Directive, TemplateRef} from '@angular/core';

@Directive({ selector: '[ivs-item-tmp]' })
export class NgxIvItemTemplateDirective {
  constructor(public template: TemplateRef<any>) {
  }
}


@Directive({ selector: '[ivs-loading-tmp]' })
export class NgxIvLoadingTemplateDirective {
  constructor(public template: TemplateRef<any>) {
  }
}
