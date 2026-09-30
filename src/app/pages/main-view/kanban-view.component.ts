import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { IBoard } from 'src/app/models/board.model';
import { MatDialog } from '@angular/material/dialog';
import { NewColumnDialogComponent } from './new-column-dialog/new-column-dialog.component';
import { ToastrService } from 'ngx-toastr';
import { NewTaskDialogComponent } from './new-task-dialog/new-task-dialog.component';
import { IColumn, ITask } from 'src/app/models/column.model';
import { bootstrapApplication } from '@angular/platform-browser';

@Component({
  standalone: false,
  selector: 'app-kanban-view',
  templateUrl: './kanban-view.component.html',
  styleUrls: ['./kanban-view.component.scss']
})

export class KanbanViewComponent implements OnInit {
  public board: IBoard= {
    name: 'Test Board',
    columns: [
      {
        name: 'toDo',
        tasks: []
      },
      {
        name: 'inProgess',
        tasks: []
      },
      {
        name: 'Done',
        tasks: []
      }
    ]
  }
  public boards: IBoard[] = [
    {
      name: 'Test Board',
      columns: [
        {
          name: 'toDo',
          tasks: []
        },
        {
          name: 'inProgess',
          tasks: []
        },
        {
          name: 'Done',
          tasks: []
        }
      ]
    },

    {
      name: 'Test Board 2',
      columns: [
        {
          name: 'toDo',
          tasks: []
        },
        {
          name: 'inProgess',
          tasks: []
        },
        {
          name: 'Done',
          tasks: []
        }
      ]
    }
    
  ]
  public currentColumn: string = '';

  constructor(
    public dialog: MatDialog,
    public toastrService: ToastrService) { }

  ngOnInit(): void {
    throw new Error('Method not implemented.');
  }

  openColumnDialog(): void {
    const dialogRef = this.dialog.open(NewColumnDialogComponent);

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      console.log(result)
      if (!(result === null || result === undefined)) {
        if (result.trim().length !== 0) {
          this.addColumn(result);
        } else {
          this.toastrService.error('Please provide a valid column name', 'Error');
        }
      }
    });
  }

  openNewTaskDialog(column: string): void {
    let newTask: ITask = { taskName: '', taskDescription: '' }
    const dialogRef = this.dialog.open(NewTaskDialogComponent, {
      data: newTask
    });
    dialogRef.afterClosed().subscribe((result: ITask) => {
      console.log(result)
      if (!(result.taskName === null || result.taskName === undefined)) {
        if (result.taskName.trim().length !== 0) {
          this.createTask(column, result);
        } else {
          this.toastrService.error('Please provide a valid task name', 'Error');
        }
      }
    })
  }

  public taskDrop(event: CdkDragDrop<ITask[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
  }

  public columnDrop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.board.columns, event.previousIndex, event.currentIndex);
  }

  public createTask(columnName: string, task: ITask) {
    this.board.columns.forEach((column: IColumn) => {
      if (column.name === columnName) {
        column.tasks.push(task);
      }
    })
  }

  public deleteTask(taskN: string) {
    this.board.columns.forEach((column: IColumn) => {
      const indexOfObject = column.tasks.findIndex((task) => {
        return task.taskName === taskN;
      });
      if (indexOfObject !== -1) {
        column.tasks.splice(indexOfObject, 1);
      }
    })
  }

  public addColumn(column: string) {
    this.board.columns.push({ name: column, tasks: [] });
  }

  public deleteColumn(columnName: string) {
    console.log(columnName)
    const indexOfObject = this.board.columns.findIndex((column) => {
      return column.name === columnName;
    });
    if (indexOfObject !== -1) {
      this.board.columns.splice(indexOfObject, 1);
    }
  }

  public createNewBoard(boardName: string){
    let currentBoards: string[] = [];
    for (const board of this.boards){
      currentBoards.push(board.name);
    }
    if(!(currentBoards.includes(boardName))){
      this.boards.push({'name': boardName, 'columns': []});
    } else {
      this.toastrService.warning('Board already exists', 'Warning');
    }
  }

  public openBoard(){
    let toOpen = this.boards.filter(b => b.name === 'hi' );
    this.board = toOpen[0];
  }

}
