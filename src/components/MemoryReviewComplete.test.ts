import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router';
import {expect,it} from 'vitest';
import {MemoryReviewComplete} from './MemoryReviewComplete';
it('shows pending instead of queue completion until the business receipt exists',()=>{
  const html=renderToStaticMarkup(createElement(MemoryRouter,null,createElement(MemoryReviewComplete,{independent:0,needsReview:0,nextReview:null,pending:1,total:1,withHint:0})));
  expect(html).toContain('Lượt ôn đang chờ xác nhận');expect(html).toContain('1 đánh giá đang chờ đồng bộ');expect(html).not.toContain('Kết trận hoàn tất');
});
