package com.echolytix.pages;

import com.echolytix.config.ConfigReader;
import com.echolytix.config.LocatorReader;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;

public class LoginPage extends BasePage {

    // Locators loaded dynamically from centralized locator.properties
    private final By emailInput = LocatorReader.getBy("login.email.input");
    private final By passwordInput = LocatorReader.getBy("login.password.input");
    private final By authorizeButton = LocatorReader.getBy("login.authorize.button");
    private final By autoFillButton = LocatorReader.getBy("login.autofill.button");
    private final By loadingSpinner = LocatorReader.getBy("login.loading.spinner");
    private final By dashboardSignOut = LocatorReader.getBy("login.dashboard.signout");
    private final By dashboardSignCard = LocatorReader.getBy("login.dashboard.signcard");

    public LoginPage(WebDriver driver) {
        super(driver);
    }

    /**
     * Waits for initial app boot/connection check to finish.
     */
    public void waitForAppReady() {
        try {
            wait.until(ExpectedConditions.invisibilityOfElementLocated(loadingSpinner));
        } catch (Exception ignored) {
        }
        wait.until(ExpectedConditions.or(
                ExpectedConditions.visibilityOfElementLocated(authorizeButton),
                ExpectedConditions.visibilityOfElementLocated(autoFillButton),
                ExpectedConditions.visibilityOfElementLocated(dashboardSignOut)
        ));
    }

    public boolean isLoginPageDisplayed() {
        return isDisplayed(authorizeButton, 2) || isDisplayed(autoFillButton, 2);
    }

    public void enterEmail(String email) {
        type(emailInput, email);
    }

    public void enterPassword(String password) {
        type(passwordInput, password);
    }

    public void clickAuthorizeButton() {
        jsClick(authorizeButton);
    }

    public void clickAutoFillButton() {
        jsClick(autoFillButton);
    }

    public DashboardPage login(String email, String password) {
        waitForAppReady();
        enterEmail(email);
        enterPassword(password);
        clickAuthorizeButton();

        // Wait for login to complete and dashboard to load
        wait.until(ExpectedConditions.or(
                ExpectedConditions.visibilityOfElementLocated(dashboardSignOut),
                ExpectedConditions.visibilityOfElementLocated(dashboardSignCard)
        ));

        return new DashboardPage(driver);
    }

    public DashboardPage loginUsingDemoCredentials() {
        waitForAppReady();
        if (isDisplayed(autoFillButton, 2)) {
            clickAutoFillButton();
        } else {
            enterEmail(ConfigReader.getUserEmail());
            enterPassword(ConfigReader.getUserPassword());
        }
        clickAuthorizeButton();

        // Wait for login to complete and dashboard to load
        wait.until(ExpectedConditions.or(
                ExpectedConditions.visibilityOfElementLocated(dashboardSignOut),
                ExpectedConditions.visibilityOfElementLocated(dashboardSignCard)
        ));

        return new DashboardPage(driver);
    }
}
