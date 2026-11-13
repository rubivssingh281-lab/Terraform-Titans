package com.terraformtitans.support;

import java.time.Duration;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.WebDriverWait;

/** Shared Chrome setup and reusable actions for the EcholytiX browser UI tests. */
public abstract class UiTestBase {
  protected WebDriver driver;
  protected WebDriverWait wait;

  @BeforeEach
  void openApp() {
    ChromeOptions options = new ChromeOptions();
    options.addArguments("--window-size=1440,1000", "--disable-notifications");
    if (Boolean.getBoolean("headless")) {
      options.addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage");
    }
    driver = new ChromeDriver(options);
    wait = new WebDriverWait(driver, Duration.ofSeconds(15));
    driver.get(System.getProperty("app.url", "http://localhost:3000/").replaceAll("/+$", ""));
    wait.until(d -> "complete".equals(((org.openqa.selenium.JavascriptExecutor) d)
        .executeScript("return document.readyState")));
    wait.until(d -> !d.findElements(By.cssSelector("form")).isEmpty()
        || !d.findElements(By.cssSelector("header")).isEmpty());
  }

  @AfterEach
  void closeApp() {
    if (driver != null) driver.quit();
  }

  protected WebElement button(String label) {
    return wait.until(d -> d.findElement(By.xpath("//button[contains(normalize-space(.), "
        + xpathText(label) + ")]")));
  }

  protected boolean visibleText(String text) {
    return driver.findElements(By.xpath("//*[contains(normalize-space(), " + xpathText(text) + ")]")).stream()
        .anyMatch(WebElement::isDisplayed);
  }

  protected void signInWithDemoAccount() {
    button("Auto-fill Testing Credentials").click();
    button("AUTHORIZE PATIENT").click();
    wait.until(d -> visibleText("Patient Profile: Sachin Gupta"));
  }

  private String xpathText(String text) {
    if (!text.contains("'")) {
      return "'" + text + "'";
    }
    String[] parts = text.split("'", -1);
    StringBuilder expression = new StringBuilder("concat(");
    for (int i = 0; i < parts.length; i++) {
      if (i > 0) {
        expression.append(", \"'\", ");
      }
      expression.append("'").append(parts[i]).append("'");
    }
    return expression.append(")").toString();
  }
}
