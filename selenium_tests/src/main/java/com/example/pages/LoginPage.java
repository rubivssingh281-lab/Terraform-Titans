package com.example.pages;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.By;

public class LoginPage extends BasePage {
    public LoginPage(WebDriver driver) {
        super(driver);
    }

    private By emailField = By.id("email");
    private By passwordField = By.id("password");
    private By loginButton = By.xpath("//button[text()='Login']");

    public void doLogin(String email, String pwd) {
        driver.findElement(emailField).sendKeys(email);
        driver.findElement(passwordField).sendKeys(pwd);
        driver.findElement(loginButton).click();
    }
}
