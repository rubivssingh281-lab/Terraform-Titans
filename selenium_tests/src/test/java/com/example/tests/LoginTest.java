package com.example.tests;

import org.junit.Test;
import com.example.pages.LoginPage;
import com.example.pages.DashboardPage;

public class LoginTest extends BaseTest {

    @Test
    public void testSuccessfulLogin() {
        // Example POM test showing the architecture
        LoginPage loginPage = new LoginPage(driver);
        loginPage.doLogin("test@user.com", "password123");
        
        DashboardPage dashboardPage = new DashboardPage(driver);
        // Add dashboard assertions here
    }
}
