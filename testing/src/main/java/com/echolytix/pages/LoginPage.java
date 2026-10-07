package com.echolytix.pages;

import com.echolytix.config.ConfigReader;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;

public class LoginPage extends BasePage {

    // Locators strictly scoped to the authentication form to prevent matching dashboard fields
    private final By emailInput = By.xpath("//form[.//button[@type='submit']]//input[@type='email']");
    private final By passwordInput = By.xpath("//form[.//button[@type='submit']]//input[@type='password'] | //input[@type='password']");
    private final By authorizeButton = By.xpath("//button[@type='submit' and (contains(., 'AUTHORIZE') or contains(., 'VERIFYING'))]");
    private final By autoFillButton = By.xpath("//button[contains(., 'Auto-fill Testing Credentials')]");
    private final By loadingSpinner = By.xpath("//*[contains(text(), 'ESTABLISHING SECURE CONNECTION')]");
    private final By dashboardSignOut = By.xpath("//button[contains(., 'Sign Out')]");
    private final By dashboardSignCard = By.xpath("//button[.//span[contains(text(), 'Sign Gestures')]]");

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
