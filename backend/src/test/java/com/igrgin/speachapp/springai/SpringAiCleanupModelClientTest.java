package com.igrgin.speachapp.springai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.igrgin.speachapp.config.AiProperties;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.openai.OpenAiChatOptions;

class SpringAiCleanupModelClientTest {
  @Test
  void sendsLunaCompatibleOptionsThroughStructuredCleanupCall() {
    ChatModel chatModel = org.mockito.Mockito.mock(ChatModel.class);
    when(chatModel.getOptions()).thenReturn(OpenAiChatOptions.builder().build());
    when(chatModel.call(any(Prompt.class))).thenReturn(new ChatResponse(List.of(
        new Generation(new AssistantMessage("""
            {"cleanedText":"I think we should test today.","uncertainties":[]}
            """))
    )));
    SpringAiCleanupModelClient client = new SpringAiCleanupModelClient(
        ChatClient.builder(chatModel),
        new AiProperties(AiProperties.SPRING_AI_OPENAI_PROVIDER_MODE, null, null)
    );

    var result = client.clean("um I think we should test today");

    assertThat(result.cleanedText()).isEqualTo("I think we should test today.");
    ArgumentCaptor<Prompt> prompt = ArgumentCaptor.forClass(Prompt.class);
    verify(chatModel).call(prompt.capture());
    assertThat(prompt.getValue().getOptions()).isInstanceOf(OpenAiChatOptions.class);
    OpenAiChatOptions options = (OpenAiChatOptions) prompt.getValue().getOptions();
    assertThat(options.getModel()).isEqualTo("gpt-6-luna");
    assertThat(options.getReasoningEffort()).isEqualTo("none");
    assertThat(options.getTemperature()).isEqualTo(0.0);
    assertThat(options.getOutputSchema()).contains("cleanedText", "uncertainties");
  }
}
