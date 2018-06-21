# ngx-infinite-virtual-scroll
---
:rocket: Native angular 6+ infinite virtual scroll component

"@angular/cdk-experimental": "^6.0.0",\
"@angular/cdk": "^6.0.0",  



## Configuration

### Main application module

You must import `NgxInfiniteVirtualScrollModule` inside your main application module (usually named AppModule) to be able to use `ngx-infinite-virtual-scroll` component and/or directive.

```diff
import { NgModule } from '@angular/core';
+ import {NgxInfiniteVirtualScrollModule} from 'ngx-infinite-virtual-scroll';

import { AppComponent } from './app.component';

@NgModule({
  imports: [
+   NgxInfiniteVirtualScrollModule
  ],
  declarations: [AppComponent],
  bootstrap: [AppComponent],
})
export class AppModule. { }

```


### Infinite virtual Scroll based on parent container
```
<div style="height: 500px">
  <ngx-infinite-virtual-scroll [ListData]="increasingSizeData2" (scrollEnd)="loadMore2()">
    <ng-template ivs-item-tmp let-item let-i="index">
      <div style="height: 50px;">
        Item #{{i}} - ({{item}}px)
      </div>
    </ng-template>
  </ngx-infinite-virtual-scroll>
</div>

```

### Infinite virtual Scroll appended to body
```
<div class="test1">
  <ngx-infinite-virtual-scroll [ListData]="increasingSizeData" [appendToBody]="true" (scrollEnd)="loadMore()">
    <ng-template ivs-item-tmp let-item let-i="index">
      <div style="height: 50px;">
        Item #{{i}} - ({{item}}px)
      </div>
    </ng-template>
  </ngx-infinite-virtual-scroll>
</div>
```


## Contribution

Contributions are always welcome, just make sure that ...

- Your code style matches with the rest of the project

## License

Licensed under [MIT](https://opensource.org/licenses/MIT).
