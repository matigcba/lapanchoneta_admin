// src/app/core/services/branch-event.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BranchEventService {
  private branchChangeSource = new Subject<number>();
  
  branchChange$ = this.branchChangeSource.asObservable();
  
  emitBranchChange(branchId: number) {
    this.branchChangeSource.next(branchId);
  }
}