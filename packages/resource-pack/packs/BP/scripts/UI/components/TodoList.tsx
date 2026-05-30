import { JSX, Panel, Text, FunctionComponent, useReducer } from '@bedrock-core/ui';
import { Button } from '@bedrock-core/ore-styled';

/**
 * ============================================================================
 * useReducer EXAMPLE - Todo List with Complex State
 * ============================================================================
 */

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

type TodoAction
  = | { type: 'add'; text: string }
    | { type: 'toggle'; id: number }
    | { type: 'remove'; id: number }
    | { type: 'clear_completed' };

function todoReducer(state: Todo[], action: TodoAction): Todo[] {
  switch (action.type) {
    case 'add':
      return [...state, { id: Date.now(), text: action.text, completed: false }];
    case 'toggle':
      return state.map(todo => todo.id === action.id ? { ...todo, completed: !todo.completed } : todo);
    case 'remove':
      return state.filter(todo => todo.id !== action.id);
    case 'clear_completed':
      return state.filter(todo => !todo.completed);
    default:
      return state;
  }
}

/**
 * TodoList - Demonstrates useReducer for complex state logic
 * Grid Position: Row 1, Column 3
 */
export const TodoList: FunctionComponent = (): JSX.Element => {
  const [todos, dispatch] = useReducer(todoReducer, []);

  // Derived state - computed directly, no useState/useEffect needed!
  const todoCount = todos.length;
  const completedCount = todos.filter(t => t.completed).length;

  const addTodo = (): void => {
    dispatch({ type: 'add', text: `Task ${todos.length + 1}` });
  };

  const clearCompleted = (): void => {
    dispatch({ type: 'clear_completed' });
  };

  return (
    <Panel flexDirection={'column'} padding={6} gap={4}>
      <Text>{'§bTodo List'}</Text>
      <Text>{`Total: §e${todoCount}`}</Text>
      <Text>{`Done: §a${completedCount}`}</Text>

      <Panel flexDirection={'row'} gap={6}>
        <Button onPress={(): void => { addTodo(); }}>{'§a+ Add'}</Button>
        <Button variant={'danger'} onPress={(): void => { clearCompleted(); }}>{'§cClear'}</Button>
      </Panel>

      <Button variant={'secondary'} onPress={(): void => {
        if (todos.length > 0) { dispatch({ type: 'toggle', id: todos[0].id }); }
      }}>
        {'§9Toggle First'}
      </Button>
    </Panel>
  );
};
