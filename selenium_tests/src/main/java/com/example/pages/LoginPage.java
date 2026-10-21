package com.example.pages;

import com.example.config.LocatorReader;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.By;

public class LoginPage extends BasePage {
    public LoginPage(WebDriver driver) {
        super(driver);
    }

    private By emailField = LocatorReader.getBy("login.email.input");
    private By passwordField = LocatorReader.getBy("login.password.input");
    private By loginButton = LocatorReader.getBy("login.simple.button");

    public void doLogin(String email, String pwd) {
        driver.findElement(emailField).sendKeys(email);
        driver.findElement(passwordField).sendKeys(pwd);
        driver.findElement(loginButton).click();
    }
}
