import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CreateUserComponent } from './admin/create-user/create-user.component';
import { ManageFundraiserComponent } from './admin/manage-fundraiser/manage-fundraiser.component'
import { VenmoBalanceModalComponent } from './components/venmo-balance-modal/venmo-balance-modal.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { EditMilesModalComponent } from './components/edit-miles-modal/edit-miles-modal.component';
import { MatIconModule } from '@angular/material/icon';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';
import { environment } from './environments/environment';
import { MatSnackBarModule } from '@angular/material/snack-bar';
// ✅ Import Angular Material Modules
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
// import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthInterceptorService } from './auth-interceptor.service';
import { ManageRunnersComponent } from './admin/manage-runners/manage-runners.component';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { MatCheckboxModule } from '@angular/material/checkbox';

const config: SocketIoConfig = { url: `${environment.apiUrl}`, options: {} }; // ✅ Replace with your backend URL

@NgModule({
  providers: [
    MatDatepickerModule, // ✅ Provide MatDatepickerModule
    MatNativeDateModule, // ✅ Provide MatNativeDateModule
    MatMomentDateModule, // ✅ Provide MatMomentDateModule
    AuthInterceptorService,
    { 
      provide: HTTP_INTERCEPTORS, 
      useClass: AuthInterceptorService, 
      multi: true 
    }
  ],
  declarations: [
    AppComponent,
    DashboardComponent,
    LoginComponent,
    RegisterComponent,
    CreateUserComponent,
    VenmoBalanceModalComponent,
    EditMilesModalComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent,
    ManageRunnersComponent, // ✅ Ensure this is declared
    ManageFundraiserComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MatDialogModule, // ✅ Ensure this is imported
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    FormsModule,
    MatSnackBarModule,
    MatSidenavModule,
    MatListModule,
    MatTableModule,
    MatCardModule,
    MatExpansionModule,
    MatTooltipModule,
    MatDatepickerModule, // ✅ Add this for Datepicker
    MatNativeDateModule, // ✅ Required for native date functionality
    MatMomentDateModule, 
    ReactiveFormsModule,
    MatCheckboxModule,
    SocketIoModule.forRoot(config)
  ],
  bootstrap: [AppComponent] // ✅ Keep this as it is
})
export class AppModule { }
