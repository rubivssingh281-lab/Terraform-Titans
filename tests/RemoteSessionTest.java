import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class RemoteSessionTest {
    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        
        HttpRequest createRequest = HttpRequest.newBuilder()
                .uri(new URI("http://localhost:3000/api/session/create"))
                .POST(HttpRequest.BodyPublishers.noBody())
                .build();
                
        HttpResponse<String> createResponse = client.send(createRequest, HttpResponse.BodyHandlers.ofString());
        assert createResponse.statusCode() == 200;
        
        String json = "{\"sessionCode\":\"123456\"}";
        HttpRequest validateRequest = HttpRequest.newBuilder()
                .uri(new URI("http://localhost:3000/api/session/validate"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
                
        HttpResponse<String> validateResponse = client.send(validateRequest, HttpResponse.BodyHandlers.ofString());
        assert validateResponse.statusCode() == 200;
        assert validateResponse.body().contains("active");
    }
}
