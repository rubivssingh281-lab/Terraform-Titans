package com.example.tests;
import java.time.Duration;
import java.util.Map;
import org.junit.Assert;
import org.junit.Test;
import org.openqa.selenium.JavascriptExecutor;
public class EcholytixApiTest extends BaseTest {

    @Test
    public void remoteSessionCreateAndValidate() {
        String script =
            "const done = arguments[arguments.length - 1];" +
            "fetch('/api/remote/session/create', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}'})" +
            "  .then(response => response.json())" +
            "  .then(data => fetch('/api/remote/session/validate?code=' + data.code)" +
            "    .then(check => check.json().then(result =>" +
            "      done({code: data.code, status: check.status, success: result.success}))));";

        Map<String, Object> result =
            (Map<String, Object>) ((JavascriptExecutor) driver).executeAsyncScript(script);

        String code = String.valueOf(result.get("code"));
        long status = ((Number) result.get("status")).longValue();
        Object success = result.get("success");

        Assert.assertTrue(code.matches("\\d{6}"));
        Assert.assertEquals(200, status);
        Assert.assertEquals(Boolean.TRUE, success);
    }

    @Test
    public void emergencySosIsStored() {
        String message = "Selenium SOS " + System.currentTimeMillis();
        String script =
            "const done = arguments[arguments.length - 1];" +
            "const message = arguments[0];" +
            "fetch('/api/emergency/sos', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({patientId: 1, message: message, latitude: 0, longitude: 0})})" +
            "  .then(response => response.json().then(data => ({status: response.status, success: data.success})))" +
            "  .then(posted => fetch('/api/emergency/sos?limit=20')" +
            "    .then(response => response.json())" +
            "    .then(list => done({status: posted.status, success: posted.success, stored: list.some(alert => alert.message === message)})));";

        Map<String, Object> result =
            (Map<String, Object>) ((JavascriptExecutor) driver).executeAsyncScript(script, message);

        long status = ((Number) result.get("status")).longValue();
        Object success = result.get("success");
        Object stored = result.get("stored");

        Assert.assertEquals(201, status);
        Assert.assertEquals(Boolean.TRUE, success);
        Assert.assertTrue(stored != null);
    }
}
