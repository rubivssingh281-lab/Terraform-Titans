package com.example.tests;
import java.time.Duration;
import java.util.Map;
import org.junit.Assert;
import org.junit.Test;
import org.openqa.selenium.JavascriptExecutor;
public class GetEmergencySosReturnsListTest extends BaseTest {

    private Map<String, Object> executeFetchScript(String script) {
        return (Map<String, Object>) ((JavascriptExecutor) driver).executeAsyncScript(script);
    }

    @Test
    public void testGetEmergencySosReturnsList() {
        String script = 
            "const done = arguments[arguments.length - 1];" +
            "fetch('/api/emergency/sos?limit=5', { method: 'GET' })" + 
            "  .then(res => res.json().then(data => done({status: res.status, isArray: Array.isArray(data)})))" +
            "  .catch(err => done({status: 500}));";
            
        Map<String, Object> result = executeFetchScript(script);
        long status = ((Number) result.get("status")).longValue();
        Assert.assertEquals(200, status);
        Assert.assertEquals(Boolean.TRUE, result.get("isArray"));
    }
}
