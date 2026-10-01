package com.echolytix.driver;

import com.echolytix.config.ConfigReader;
import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.edge.EdgeDriver;
import org.openqa.selenium.edge.EdgeOptions;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

public class DriverManager {
    private static final ThreadLocal<WebDriver> driverThreadLocal = new ThreadLocal<>();

    public static WebDriver getDriver() {
        return driverThreadLocal.get();
    }

    public static void initDriver() {
        if (driverThreadLocal.get() == null) {
            String browser = ConfigReader.getBrowser().toLowerCase();
            boolean headless = ConfigReader.isHeadless();

            WebDriver driver;
            if (browser.contains("edge")) {
                WebDriverManager.edgedriver().setup();
                EdgeOptions options = new EdgeOptions();
                if (headless) {
                    options.addArguments("--headless=new");
                }
                options.addArguments("--use-fake-ui-for-media-stream");
                options.addArguments("--use-fake-device-for-media-stream");
                options.addArguments("--disable-notifications");
                driver = new EdgeDriver(options);
            } else {
                WebDriverManager.chromedriver().setup();
                ChromeOptions options = new ChromeOptions();
                if (headless) {
                    options.addArguments("--headless=new");
                }
                // Grant camera permissions automatically without popups
                options.addArguments("--use-fake-ui-for-media-stream");
                options.addArguments("--use-fake-device-for-media-stream");
                options.addArguments("--disable-notifications");
                options.addArguments("--remote-allow-origins=*");
                options.addArguments("--disable-gpu");
                options.addArguments("--window-size=1920,1080");

                // Disable geolocation/camera permission prompts
                Map<String, Object> prefs = new HashMap<>();
                prefs.put("profile.default_content_setting_values.media_stream_camera", 1);
                prefs.put("profile.default_content_setting_values.media_stream_mic", 1);
                prefs.put("profile.default_content_setting_values.geolocation", 1);
                prefs.put("profile.default_content_setting_values.notifications", 1);
                options.setExperimentalOption("prefs", prefs);

                driver = new ChromeDriver(options);
            }

            driver.manage().window().maximize();
            driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(ConfigReader.getImplicitTimeout()));
            driverThreadLocal.set(driver);
        }
    }

    public static void quitDriver() {
        WebDriver driver = driverThreadLocal.get();
        if (driver != null) {
            try {
                driver.quit();
            } catch (Exception e) {
                System.err.println("Exception while quitting driver: " + e.getMessage());
            } finally {
                driverThreadLocal.remove();
            }
        }
    }
}
