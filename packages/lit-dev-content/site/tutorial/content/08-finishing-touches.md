As templates get big and complicated, it can help to break them down into smaller pieces. Here we've added a **Hide completed** checkbox to the to-do list. We've also pulled the main todo list template out into a separate local constant, `todos`. You can think of this as a partial template.

You'll notice the `todos` partial is *almost* identical to the `<ul>` element in the previous step, except that it's using the new `items` local constant instead of `this.listItems`.

Your mission: refactor the template to hide the completed items when **Hide completed** is checked and show a message when no uncompleted items are displayed.

*   **Calculate the items to display.**

    Find the definition for the `items` constant at the beginning of the `render()` method and replace it with the following code:

    ```ts
    const items = this.hideCompleted
      ? this.listItems.filter((item) => !item.completed)
      : this.listItems;
    ```

*   **Define some partial templates.**

    Add the following code just before the `return` statement.

    ```ts
    const caughtUpMessage = html`
      <p>
      You're all caught up!
      </p>
    `;
    const todosOrMessage = items.length > 0
      ? todos
      : caughtUpMessage;
    ```

*   **Put it all together.**

    In the main template, find the `${todos}` expression, and replace it with your new partial template:

    ```js
    ${todosOrMessage}
    ```

    The end result should look like this:

    ```ts
    return html`
      <h2>To Do</h2>
      ${todosOrMessage}
      <input id="newitem" aria-label="New item">
      ...
    ```

Try clicking **hideCompleted** and make sure your code worked. Go ahead and cross off **Complete Lit tutorial.** (If anything's not working, check your work or click **Solve** to see the finished code.)

If you'd like to keep experimenting with Lit online, you can head over to the [Playground](/playground/). Or if you're ready to try something real, you might want to check out our component [Starter kits](/docs/tools/starter-kits/) or [add Lit to an existing project](/docs/tools/adding-lit/).
