package com.example.tests;

import com.example.config.ConfigReader;
import com.example.driver.DriverManager;
import org.junit.After;
import org.junit.Before;
import org.openqa.selenium.WebDriver;
import java.util.Properties;

public class BaseTest {
    protected WebDriver driver;
    protected Properties prop;

    @Before
    public void setUp() {
        prop = ConfigReader.initProperties();
        String browserName = prop.getProperty("browser");
        driver = DriverManager.initDriver(browserName);
        driver.get(prop.getProperty("url"));
    }

    @After
    public void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }
}
