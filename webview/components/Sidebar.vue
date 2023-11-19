<script setup lang="ts">
import { ref, Ref } from "vue";

interface issue {
  name: string;
  url: string;
}

const issues: Ref<issue[]> = ref([]);

const handleCountClick = () => {
  // @ts-ignore
  tsvscode.postMessage({
    command: "WebSendMesToVsCode",
    key: "spent",
    data: "test",
  });
};

window.addEventListener("message", (event) => {
  const message = event.data;

  console.log("3333333333333333", message);

  switch (message.command) {
    case "vscodeSendMesToWeb":
      if (message.key === "issues") {
        issues.value = message.data;
      }
      return;
  }
});
</script>

<template>
  <ul>
    <li v-for="issue in issues">
      <a :href="issue.url">
        {{ issue.name }}
      </a>
    </li>
  </ul>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
