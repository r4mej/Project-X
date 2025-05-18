import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text, View } from 'react-native';

// Example component to test
const ExampleComponent = () => (
  <View>
    <Text>Hello, Testing!</Text>
  </View>
);

describe('Example Component', () => {
  it('renders correctly', () => {
    render(<ExampleComponent />);
    const textElement = screen.getByText('Hello, Testing!');
    expect(textElement).toBeTruthy();
  });
}); 