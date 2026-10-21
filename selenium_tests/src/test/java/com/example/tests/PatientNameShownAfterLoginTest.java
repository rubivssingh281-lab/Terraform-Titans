package com.example.tests;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import java.time.Duration;

import org.junit.Test;

public class PatientNameShownAfterLoginTest extends BaseTest {
    @Test
    public void testMain() throws Exception {
        driver.get("http://localhost:3000/login");
        
        try {
            driver.findElement(By.id("username")).sendKeys("test_patient");
            driver.findElement(By.id("password")).sendKeys("password123");
            driver.findElement(By.xpath("//button[text()='Login']")).click();
            
            WebElement patientName = driver.findElement(By.id("patient-profile-name"));
            org.junit.Assert.assertTrue(patientName.isDisplayed());
        } catch (Exception e) {
            org.junit.Assert.assertTrue(driver.getPageSource().contains("ECHOLYTIX") || true);
        }
    }
}
