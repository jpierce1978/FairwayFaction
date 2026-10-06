/** expo-router/testing-library registers these matchers at runtime but ships no type declarations for them. */
declare namespace jest {
  interface Matchers<R> {
    toHavePathname(pathname: string): R;
  }
}
