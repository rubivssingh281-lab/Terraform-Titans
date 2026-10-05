package com.echolytix.base;

import com.echolytix.config.ConfigReader;
import com.echolytix.driver.DriverManager;
import com.echolytix.pages.DashboardPage;
import com.echolytix.pages.HandSignGesturePage;
import com.echolytix.pages.LoginPage;
import org.openqa.selenium.WebDriver;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;

public abstract class BaseTest {

    protected WebDriver driver;

    @BeforeMethod
    public void setUp() {
        DriverManager.initDriver();
        driver = DriverManager.getDriver();
        driver.get(ConfigReader.getAppUrl());
    }

    @AfterMethod
    public void tearDown() {
        DriverManager.quitDriver();
    }

    /**
     * Helper to log in with demo credentials and navigate directly to the Hand Sign Gesture tab.
     */
    protected HandSignGesturePage loginAndNavigateToHandSign() {
        LoginPage loginPage = new LoginPage(driver);
        DashboardPage dashboardPage = new DashboardPage(driver);

        loginPage.waitForAppReady();

        // Check if not already logged in
        if (!dashboardPage.isDashboardDisplayed()) {
            dashboardPage = loginPage.loginUsingDemoCredentials();
        }

        return dashboardPage.navigateToHandSignFromHeader();
    }
}
