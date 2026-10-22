# Research: current Java Spring AI React stack

Date: 2026-07-08

Issue: [#2 Research current Java Spring AI React stack](https://github.com/igrgin/voice-draft/issues/2)

## Question

What current stable stack should anchor the app: Java version, Spring Boot version, Spring AI version, Maven setup, React version, and frontend build tooling? Capture compatibility constraints, especially Spring Boot/Spring AI Java requirements and dependency-management recommendations.

## Recommendation

Use this as the initial stable stack:

| Area | Recommendation | Source |
| --- | --- | --- |
| Java | JDK 25 LTS for local, CI, and runtime; compile with `maven.compiler.release`/Spring `java.version` set to `25`. | Oracle lists JDK 25 as the latest Java SE LTS release and JDK 26 as the latest feature release. OpenJDK says JDK 25 reached GA on 2025-09-16. [Oracle Java downloads](https://www.oracle.com/java/technologies/downloads/), [OpenJDK JDK 25](https://openjdk.org/projects/jdk/25/) |
| Spring Boot | Spring Boot `4.1.0`. | The Spring Boot project page identifies Spring Boot `4.1.0`; the release post says `4.1.0` was released and is available from Maven Central. [Spring Boot project](https://spring.io/projects/spring-boot/), [Spring Boot 4.1.0 release](https://spring.io/blog/2026/06/10/spring-boot-4/) |
| Spring AI | Spring AI `2.0.0`. | The Spring AI project page identifies Spring AI `2.0.0`; the GA post says Spring AI `2.0.0` was released and is available from Maven Central. [Spring AI project](https://spring.io/projects/spring-ai/), [Spring AI 2.0.0 GA](https://spring.io/blog/2026/06/12/spring-ai-2-0-0-GA-available-now/) |
| Backend build | Maven with `spring-boot-starter-parent` `4.1.0`; import `org.springframework.ai:spring-ai-bom:2.0.0`; rely on Maven Central for release artifacts. | Spring Boot's Maven plugin docs recommend inheriting from `spring-boot-starter-parent` for defaults and dependency/plugin management. Spring AI docs recommend its BOM and say release artifacts are in Maven Central with no additional repository configuration required. [Spring Boot Maven plugin docs](https://docs.spring.io/spring-boot/maven-plugin/using.html), [Spring AI getting started](https://docs.spring.io/spring-ai/reference/getting-started.html) |
| React | React `19.2.x`, currently `react@19.2.7` and `react-dom@19.2.7`. | React's version page says the latest documented major/minor is `19.2`; the npm registry currently reports `19.2.7` for both packages. [React versions](https://react.dev/versions), [react npm](https://www.npmjs.com/package/react), [react-dom npm](https://www.npmjs.com/package/react-dom) |
| Frontend build | Vite `8.1.x`, currently `vite@8.1.3`, with `@vitejs/plugin-react@6.0.3`, scaffolded from Vite's `react-ts` template. Use Node.js `24.18.0` LTS or newer compatible LTS. | Vite says the current supported line with regular patches is `vite@8.1`, Vite's npm page reports `8.1.3`, and Vite lists `react-ts` as a supported template. The Node.js download page lists `v24.18.0` as Latest LTS. [Vite releases](https://vite.dev/releases), [vite npm](https://www.npmjs.com/package/vite), [@vitejs/plugin-react npm](https://www.npmjs.com/package/%40vitejs/plugin-react), [Vite guide](https://vite.dev/guide/), [Node.js downloads](https://nodejs.org/en/download) |

## Compatibility Constraints

Spring Boot `4.1.0` requires at least Java 17 and is compatible with Java versions up to and including Java 26; it also requires Spring Framework `7.0.8` or above. This means JDK 25 is inside the supported Spring Boot range, while JDK 17 remains the minimum possible runtime target. [Spring Boot system requirements](https://docs.spring.io/spring-boot/system-requirements.html)

Spring AI `2.0.x` supports Spring Boot `4.0.x` and `4.1.x`. Its GA announcement also states that Spring AI 2.0 was designed for Spring Boot `4.0`/`4.1` and Spring Framework `7.0`. This makes Spring AI `2.0.0` and Spring Boot `4.1.0` the aligned current baseline. [Spring AI getting started](https://docs.spring.io/spring-ai/reference/getting-started.html), [Spring AI 2.0.0 GA](https://spring.io/blog/2026/06/12/spring-ai-2-0-0-GA-available-now/)

Spring Boot explicitly supports Maven `3.6.3` or later, so the backend build should use Maven `3.6.3+`. [Spring Boot system requirements](https://docs.spring.io/spring-boot/system-requirements.html)

The Spring Boot starter parent sets Java 17 as the default compiler level and provides UTF-8 source encoding, `-parameters`, dependency management inherited from `spring-boot-dependencies`, and plugin management. Because this app should anchor on JDK 25, override the parent default with `<java.version>25</java.version>`. [Spring Boot Maven plugin docs](https://docs.spring.io/spring-boot/maven-plugin/using.html), [Spring Boot starter parent in Maven Central](https://central.sonatype.com/artifact/org.springframework.boot/spring-boot-starter-parent)

Spring Boot warns that each release is designed and tested against a specific set of third-party dependencies and that overriding managed versions may cause compatibility issues. Keep Spring-managed dependency versions unless there is a concrete need to override. [Spring Boot Maven plugin docs](https://docs.spring.io/spring-boot/maven-plugin/using.html)

Spring AI's BOM is dependency-management only: it declares recommended versions for Spring AI dependencies but has no plugin declarations and no direct references to Spring or Spring Boot. Use Spring Boot's parent or `spring-boot-dependencies` for Spring Boot dependency management, and import the Spring AI BOM for Spring AI modules. [Spring AI getting started](https://docs.spring.io/spring-ai/reference/getting-started.html), [spring-ai-bom in Maven Central](https://central.sonatype.com/artifact/org.springframework.ai/spring-ai-bom)

Spring AI release artifacts are in Maven Central; no extra release repository is required. Add Spring snapshot repositories only for snapshot versions, not for the recommended stable stack. [Spring AI getting started](https://docs.spring.io/spring-ai/reference/getting-started.html)

Vite requires Node.js `20.19+` or `22.12+`; Node.js `24.18.0` LTS satisfies that floor and is the current LTS on the Node.js download page. [Vite guide](https://vite.dev/guide/), [Node.js downloads](https://nodejs.org/en/download)

Vite `8.1` is the current minor receiving regular patches; important/security fixes are backported to `7.3` and `8.0`, and security fixes to `6.4`, but new work should start on the current supported minor. [Vite releases](https://vite.dev/releases)

React's docs track the latest major/minor and currently identify `19.2` as latest. The npm registry reports current package patches; use `react@19.2.7` and `react-dom@19.2.7` rather than an older `19.2.0` patch. React's security advisory for React Server Components says fixes were introduced in `19.0.1`, `19.1.2`, and `19.2.1`, so `19.2.7` is beyond the fixed patch. [React versions](https://react.dev/versions), [react npm](https://www.npmjs.com/package/react), [react-dom npm](https://www.npmjs.com/package/react-dom), [React RSC security advisory](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components)

For this app's first frontend, use plain Vite React rather than React Server Components. The React RSC advisory lists frameworks/bundlers with RSC support, including `@vitejs/plugin-rsc`, as affected surfaces; avoiding RSC keeps the first frontend simpler and avoids adding that compatibility surface until there is a product need. [React RSC security advisory](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components)

## Maven Shape

Recommended initial backend `pom.xml` shape:

```xml
<parent>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-parent</artifactId>
  <version>4.1.0</version>
</parent>

<properties>
  <java.version>25</java.version>
  <spring-ai.version>2.0.0</spring-ai.version>
</properties>

<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>org.springframework.ai</groupId>
      <artifactId>spring-ai-bom</artifactId>
      <version>${spring-ai.version}</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
```

Add Spring Boot starters and Spring AI starters without explicit versions unless they are outside the imported BOMs. For example, a first OpenAI-backed backend can add `spring-boot-starter-web` and the relevant Spring AI model starter without version tags, following the Boot parent and Spring AI BOM dependency-management model. [Spring Boot Maven plugin docs](https://docs.spring.io/spring-boot/maven-plugin/using.html), [Spring AI getting started](https://docs.spring.io/spring-ai/reference/getting-started.html)

## Frontend Shape

Recommended initial frontend:

```bash
npm create vite@latest frontend -- --template react-ts
```

Then keep these package anchors in `frontend/package.json`:

```json
{
  "dependencies": {
    "react": "^19.2.7",
    "react-dom": "^19.2.7"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^6.0.3",
    "vite": "^8.1.3"
  },
  "engines": {
    "node": ">=24.18.0"
  }
}
```

Vite's docs list `react-ts` as a supported template and show the default `dev`, `build`, and `preview` scripts for scaffolded projects. Keeping the frontend in a `frontend/` directory lets the Java backend and React app evolve independently while the API contract is still forming. [Vite guide](https://vite.dev/guide/)

## Decision

Anchor the app on JDK 25 LTS, Spring Boot 4.1.0, Spring AI 2.0.0, Maven with Spring Boot parent plus Spring AI BOM, React 19.2.7, Vite 8.1.3, `@vitejs/plugin-react` 6.0.3, and Node.js 24.18.0 LTS. This stack is internally compatible because Spring AI 2.0.x explicitly supports Spring Boot 4.0.x/4.1.x, Spring Boot 4.1.0 supports Java 17 through 26, and the recommended JDK 25 is the latest Java LTS within that supported range. [Spring AI getting started](https://docs.spring.io/spring-ai/reference/getting-started.html), [Spring Boot system requirements](https://docs.spring.io/spring-boot/system-requirements.html), [Oracle Java downloads](https://www.oracle.com/java/technologies/downloads/)
