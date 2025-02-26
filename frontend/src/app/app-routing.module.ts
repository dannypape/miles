import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { CreateUserComponent } from './admin/create-user/create-user.component';
import { ManageRunnersComponent } from './admin/manage-runners/manage-runners.component';
import { ManageFundraiserComponent } from './admin/manage-fundraiser/manage-fundraiser.component';
import { AdminGuard } from './guards/admin.guard';
import { ResetPasswordComponent } from './reset-password/reset-password.component';

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'admin/create-user', component: CreateUserComponent, canActivate: [AdminGuard] },
  { path: 'admin/runners', component: ManageRunnersComponent, canActivate: [AdminGuard] },
  { path: 'admin/fundraiser', component: ManageFundraiserComponent, canActivate: [AdminGuard] },
  { path: '**', redirectTo: '/dashboard' } // Redirect unknown routes to dashboard
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}