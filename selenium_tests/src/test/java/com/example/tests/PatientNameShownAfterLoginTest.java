package com.example.tests;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import java.time.Duration;

import org.junit.Test;

public class PatientNameShownAfterLoginTest extends BaseTest {
    @Test
    public void testMain() throws Exception {
        WebDriver driver = new ChromeDriver();
        driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));
        
        driver.get("http://localhost:3000/login");
        
        driver.findElement(By.id("username")).sendKeys("test_patient");
        driver.findElement(By.id("password")).sendKeys("password123");
        driver.findElement(By.xpath("//button[text()='Login']")).click();
        
        WebElement patientName = driver.findElement(By.id("patient-profile-name"));
        assert patientName.isDisplayed();
        
        driver.quit();
    }
}
