package com.terraformtitans.authentication;

import static org.junit.jupiter.api.Assertions.*;

import com.terraformtitans.support.UiTestBase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebElement;
import java.util.List;

/** The five authentication UI cases from the provided test-case table. */
class AuthenticationUiTests extends UiTestBase {
  /** Steps: leave email and password empty; submit; verify required-field feedback and no loading state. */
  @Test @DisplayName("Block sign-in when fields are empty")
  void emptyLoginShowsRequiredMessage() {
    button("AUTHORIZE PATIENT").click();
    List<WebElement> requiredFields = driver.findElements(By.cssSelector("form input[required]"));
    assertEquals(2, requiredFields.size(), "Email and password should both be required");
    for (WebElement field : requiredFields) {
      assertTrue((Boolean) ((JavascriptExecutor) driver)
          .executeScript("return arguments[0].validity.valueMissing", field));
    }
    assertTrue(button("AUTHORIZE PATIENT").isEnabled(), "Login should remain ready; it must not stay loading");
  }

  /** Steps: create a registration mismatch message; switch to Login and back; verify the old message clears. */
  @Test @DisplayName("Switch between login and registration screens")
  void switchingScreensClearsOldMessages() {
    button("Register Account").click();
    fillRegistration("patient@example.com", "Patient123", "Patient456");
    button("REGISTER NEW PATIENT").click();
    assertTrue(visibleText("Passwords do not match."));
    button("Sign In Here").click();
    assertTrue(visibleText("AUTHORIZE PATIENT"));
    assertFalse(visibleText("Passwords do not match."));
    button("Register Account").click();
    assertTrue(visibleText("REGISTER NEW PATIENT"));
    assertFalse(visibleText("Passwords do not match."));
  }

  /** Steps: enter required registration fields and an invalid email; submit and verify browser validation blocks it. */
  @Test @DisplayName("Validate email format during registration")
  void invalidRegistrationEmailIsRejected() {
    openRegistration();
    fillRegistration("patient@", "Patient123", "Patient123");
    button("REGISTER NEW PATIENT").click();
    WebElement email = driver.findElement(By.cssSelector("input[type='email']"));
    boolean invalid = (Boolean) ((JavascriptExecutor) driver)
        .executeScript("return arguments[0].validity.typeMismatch", email);
    assertTrue(invalid, "Invalid email should be blocked by the form/browser validator");
    assertTrue(visibleText("REGISTER NEW PATIENT"), "Registration form should remain visible");
  }

  /** Steps: enter a valid email and a password shorter than eight characters; verify strength guidance. */
  @Test @DisplayName("Show password strength feedback")
  void weakRegistrationPasswordShowsGuidance() {
    openRegistration();
    fillRegistration("patient@example.com", "short", "short");
    button("REGISTER NEW PATIENT").click();
    assertTrue(visibleText("Password must be at least 8 characters long."));
  }

  /** Steps: enter different valid password and confirmation values; verify mismatch feedback. */
  @Test @DisplayName("Show confirmation mismatch feedback")
  void differentConfirmationShowsMismatch() {
    openRegistration();
    fillRegistration("patient@example.com", "Patient123", "Patient456");
    button("REGISTER NEW PATIENT").click();
    assertTrue(visibleText("Passwords do not match."));
    assertTrue(visibleText("REGISTER NEW PATIENT"));
  }

  private void openRegistration() { button("Register Account").click(); }

  private void fillRegistration(String email, String password, String confirmation) {
    driver.findElement(By.cssSelector("input[placeholder='Stephen Hawking']")).sendKeys("Test Patient");
    driver.findElement(By.cssSelector("input[type='email']")).sendKeys(email);
    driver.findElement(By.cssSelector("input[placeholder='Min 8 chars, letter & number']")).sendKeys(password);
    driver.findElement(By.cssSelector("input[placeholder='Re-type password']")).sendKeys(confirmation);
  }
}
